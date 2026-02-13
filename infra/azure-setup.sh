#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# GoRigo — Azure UK South Infrastructure Setup
# 
# Prerequisites:
#   1. Azure CLI installed or available (Replit Shell / Azure Cloud Shell)
#   2. Logged in: az login --use-device-code
#
# Usage:
#   chmod +x infra/azure-setup.sh
#   ./infra/azure-setup.sh
#
# This script creates:
#   - Resource Group (UK South)
#   - Azure Container Registry
#   - App Service Plan (Linux, B2 tier — auto-scale ready)
#   - Web App for Containers
#   - PostgreSQL Flexible Server (UK South)
#   - Key Vault for secrets
#   - Auto-scale rules
#
# Safe to re-run — skips resources that already exist.
###############################################################################

APP_NAME="gorigo"
LOCATION="uksouth"
RESOURCE_GROUP="${APP_NAME}-rg"
ACR_NAME="${APP_NAME}acr"
APP_SERVICE_PLAN="${APP_NAME}-plan"
WEBAPP_NAME="${APP_NAME}-app"
PG_SERVER_NAME="${APP_NAME}-pgserver"
PG_DB_NAME="${APP_NAME}db"
PG_ADMIN_USER="${APP_NAME}admin"
KEYVAULT_NAME="${APP_NAME}-kv"

echo "============================================"
echo " GoRigo Azure UK South Setup"
echo "============================================"
echo ""
echo "Location:        $LOCATION"
echo "Resource Group:  $RESOURCE_GROUP"
echo "Web App:         $WEBAPP_NAME"
echo "PostgreSQL:      $PG_SERVER_NAME"
echo "Key Vault:       $KEYVAULT_NAME"
echo ""

read -p "Enter PostgreSQL admin password (min 8 chars, mixed case + numbers): " -s PG_ADMIN_PASSWORD
echo ""
read -p "Enter a session secret for the app: " -s SESSION_SECRET
echo ""

echo ""
echo "[1/8] Creating Resource Group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags project=gorigo environment=production \
  -o none
echo "  Resource Group ready."

echo ""
echo "[2/8] Creating Azure Container Registry..."
if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "  Container Registry already exists, continuing..."
else
  az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --location "$LOCATION" \
    --admin-enabled true
  echo "  Container Registry created."
fi

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

if [[ -z "$ACR_LOGIN_SERVER" || -z "$ACR_USERNAME" || -z "$ACR_PASSWORD" ]]; then
  echo "  ERROR: Failed to retrieve Container Registry credentials. Cannot continue."
  exit 1
fi
echo "  ACR credentials retrieved: $ACR_LOGIN_SERVER"

echo ""
echo "[3/8] Creating App Service Plan (S1, Linux, auto-scale ready)..."
if az appservice plan show --name "$APP_SERVICE_PLAN" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "  App Service Plan already exists, continuing..."
else
  az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --is-linux \
    --sku S1
  echo "  App Service Plan created."
fi

echo ""
echo "[4/8] Creating Web App for Containers..."
if az webapp show --name "$WEBAPP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "  Web App already exists, continuing..."
else
  az webapp create \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --name "$WEBAPP_NAME" \
    --container-image-name "${ACR_LOGIN_SERVER}/${APP_NAME}:latest" \
    --container-registry-url "https://${ACR_LOGIN_SERVER}" \
    --container-registry-user "$ACR_USERNAME" \
    --container-registry-password "$ACR_PASSWORD"
  echo "  Web App created."
fi

az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --always-on true \
  --http20-enabled true \
  --min-tls-version 1.2 \
  --ftps-state Disabled \
  -o none

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings \
    WEBSITES_PORT=8080 \
    NODE_ENV=production \
    NEXT_OUTPUT=standalone \
  -o none

az webapp log config \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --docker-container-logging filesystem \
  --level information \
  -o none

echo "  Web App configured."

echo ""
echo "[5/8] Creating PostgreSQL Flexible Server (this takes a few minutes)..."
if az postgres flexible-server show --name "$PG_SERVER_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "  PostgreSQL server already exists, continuing..."
else
  az postgres flexible-server create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PG_SERVER_NAME" \
    --location "$LOCATION" \
    --admin-user "$PG_ADMIN_USER" \
    --admin-password "$PG_ADMIN_PASSWORD" \
    --sku-name Standard_B2s \
    --tier Burstable \
    --storage-size 32 \
    --version 16 \
    --yes
  echo "  PostgreSQL server created."
fi

echo "  Creating database..."
if az postgres flexible-server db show --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER_NAME" --database-name "$PG_DB_NAME" &>/dev/null; then
  echo "  Database already exists."
else
  az postgres flexible-server db create \
    --resource-group "$RESOURCE_GROUP" \
    --server-name "$PG_SERVER_NAME" \
    --database-name "$PG_DB_NAME" \
    -o none
  echo "  Database created."
fi

echo "  Enabling SSL..."
az postgres flexible-server parameter set \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$PG_SERVER_NAME" \
  --name require_secure_transport \
  --value on \
  -o none || echo "  WARNING: Could not set SSL parameter. Check server status."

echo "  Adding firewall rules for Web App..."
WEBAPP_OUTBOUND_IPS=$(az webapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --query possibleOutboundIpAddresses -o tsv)

if [[ -z "$WEBAPP_OUTBOUND_IPS" ]]; then
  echo "  WARNING: Could not retrieve Web App outbound IPs. You may need to add firewall rules manually."
else
  IFS=',' read -ra IP_ARRAY <<< "$WEBAPP_OUTBOUND_IPS"
  for ip in "${IP_ARRAY[@]}"; do
  az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PG_SERVER_NAME" \
    --rule-name "webapp-${ip//./-}" \
    --start-ip-address "$ip" \
    --end-ip-address "$ip" \
    -o none 2>/dev/null || true
  done
  echo "  Firewall rules added."
fi

DATABASE_URL="postgresql://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_SERVER_NAME}.postgres.database.azure.com:5432/${PG_DB_NAME}?sslmode=require"

echo ""
echo "[6/8] Creating Key Vault..."
if az keyvault show --name "$KEYVAULT_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "  Key Vault already exists, continuing..."
else
  az keyvault create \
    --name "$KEYVAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku standard \
    --enable-rbac-authorization true
  echo "  Key Vault created."
fi

echo "  Storing secrets in Key Vault..."
KV_OK=true
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "DATABASE-URL" --value "$DATABASE_URL" -o none 2>/dev/null || KV_OK=false
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "SESSION-SECRET" --value "$SESSION_SECRET" -o none 2>/dev/null || KV_OK=false
if [[ "$KV_OK" == "false" ]]; then
  echo "  NOTE: Key Vault RBAC needs role assignment. Secrets will be stored directly"
  echo "  in Web App settings (step 7/8) instead. You can add Key Vault RBAC later via:"
  echo "    az role assignment create --role 'Key Vault Secrets Officer' --assignee <your-user-object-id> --scope /subscriptions/<sub>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEYVAULT_NAME"
else
  echo "  Secrets stored in Key Vault."
fi

echo ""
echo "[7/8] Configuring Web App environment variables..."
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    SESSION_SECRET="$SESSION_SECRET" \
  -o none
echo "  Environment variables set."

echo ""
echo "[8/8] Setting up auto-scale rules..."
if az monitor autoscale show --name "${APP_NAME}-autoscale" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "  Auto-scale already configured, skipping..."
else
  az monitor autoscale create \
    --resource-group "$RESOURCE_GROUP" \
    --name "${APP_NAME}-autoscale" \
    --resource "$APP_SERVICE_PLAN" \
    --resource-type Microsoft.Web/serverfarms \
    --min-count 1 \
    --max-count 5 \
    --count 1 \
    -o none

  az monitor autoscale rule create \
    --resource-group "$RESOURCE_GROUP" \
    --autoscale-name "${APP_NAME}-autoscale" \
    --condition "CpuPercentage > 70 avg 5m" \
    --scale out 1 \
    -o none

  az monitor autoscale rule create \
    --resource-group "$RESOURCE_GROUP" \
    --autoscale-name "${APP_NAME}-autoscale" \
    --condition "CpuPercentage < 30 avg 10m" \
    --scale in 1 \
    -o none

  echo "  Auto-scale configured."
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)

echo ""
echo "============================================"
echo " Setup Complete!"
echo "============================================"
echo ""
echo "Resources created in Azure UK South:"
echo "  Resource Group:     $RESOURCE_GROUP"
echo "  Container Registry: $ACR_LOGIN_SERVER"
echo "  Web App:            https://${WEBAPP_NAME}.azurewebsites.net"
echo "  PostgreSQL:         ${PG_SERVER_NAME}.postgres.database.azure.com"
echo "  Key Vault:          $KEYVAULT_NAME"
echo ""
echo "----------------------------------------------"
echo " SAVE THESE VALUES — you need them for GitHub"
echo "----------------------------------------------"
echo ""
echo "  ACR_LOGIN_SERVER=$ACR_LOGIN_SERVER"
echo "  ACR_USERNAME=$ACR_USERNAME"
echo "  ACR_PASSWORD=$ACR_PASSWORD"
echo "  DATABASE_URL=$DATABASE_URL"
echo ""
echo "To create AZURE_CREDENTIALS for GitHub, run:"
echo "  az ad sp create-for-rbac --name gorigo-deploy --role contributor --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP --json-auth"
echo ""
echo "Add AI keys to Web App:"
echo "  az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME --settings AI_INTEGRATIONS_OPENAI_API_KEY=<key> AI_INTEGRATIONS_ANTHROPIC_API_KEY=<key> AI_INTEGRATIONS_OPENROUTER_API_KEY=<key>"
echo ""
echo "Push to GitHub main branch to trigger deployment."
echo ""
