#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# GoRigo — Azure UK South Infrastructure Setup (Container Apps)
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
#   - Log Analytics Workspace
#   - Container Apps Environment
#   - Container App (gorigo-app)
#   - PostgreSQL Flexible Server (UK South)
#   - Key Vault for secrets
#
# Uses Azure Container Apps — no VM quotas required.
# Safe to re-run — skips resources that already exist.
###############################################################################

APP_NAME="gorigo"
LOCATION="uksouth"
RESOURCE_GROUP="${APP_NAME}-rg"
ACR_NAME="${APP_NAME}acr"
CONTAINER_ENV="${APP_NAME}-env"
CONTAINER_APP="${APP_NAME}-app"
PG_SERVER_NAME="${APP_NAME}-pgserver"
PG_DB_NAME="${APP_NAME}db"
PG_ADMIN_USER="${APP_NAME}admin"
KEYVAULT_NAME="${APP_NAME}-kv"
LOG_ANALYTICS_NAME="${APP_NAME}-logs"

echo "============================================"
echo " GoRigo Azure UK South Setup"
echo " (Using Azure Container Apps)"
echo "============================================"
echo ""
echo "Location:           $LOCATION"
echo "Resource Group:     $RESOURCE_GROUP"
echo "Container App:      $CONTAINER_APP"
echo "PostgreSQL:         $PG_SERVER_NAME"
echo "Key Vault:          $KEYVAULT_NAME"
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
    --admin-enabled true \
    -o none
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
echo "[3/8] Creating Log Analytics Workspace..."
if az monitor log-analytics workspace show --resource-group "$RESOURCE_GROUP" --workspace-name "$LOG_ANALYTICS_NAME" &>/dev/null; then
  echo "  Log Analytics Workspace already exists, continuing..."
else
  az monitor log-analytics workspace create \
    --resource-group "$RESOURCE_GROUP" \
    --workspace-name "$LOG_ANALYTICS_NAME" \
    --location "$LOCATION" \
    -o none
  echo "  Log Analytics Workspace created."
fi

LOG_ANALYTICS_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_NAME" \
  --query customerId -o tsv)

LOG_ANALYTICS_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_NAME" \
  --query primarySharedKey -o tsv)

echo ""
echo "[4/8] Creating Container Apps Environment..."
if az containerapp env show --name "$CONTAINER_ENV" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "  Container Apps Environment already exists, continuing..."
else
  az containerapp env create \
    --name "$CONTAINER_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --logs-workspace-id "$LOG_ANALYTICS_ID" \
    --logs-workspace-key "$LOG_ANALYTICS_KEY" \
    -o none
  echo "  Container Apps Environment created."
fi

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
  -o none || echo "  WARNING: Could not set SSL parameter."

echo "  Allowing Azure services access to PostgreSQL..."
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PG_SERVER_NAME" \
  --rule-name "AllowAzureServices" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0" \
  -o none 2>/dev/null || echo "  Firewall rule already exists."

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
    --enable-rbac-authorization true \
    -o none
  echo "  Key Vault created."
fi

echo "  Storing secrets in Key Vault..."
KV_OK=true
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "DATABASE-URL" --value "$DATABASE_URL" -o none 2>/dev/null || KV_OK=false
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "SESSION-SECRET" --value "$SESSION_SECRET" -o none 2>/dev/null || KV_OK=false
if [[ "$KV_OK" == "false" ]]; then
  echo "  NOTE: Key Vault RBAC needs role assignment. Secrets will be set directly"
  echo "  on the Container App instead. You can configure Key Vault RBAC later."
else
  echo "  Secrets stored in Key Vault."
fi

echo ""
echo "[7/8] Creating Container App..."
if az containerapp show --name "$CONTAINER_APP" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "  Container App already exists, updating configuration..."
  az containerapp update \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --set-env-vars \
      DATABASE_URL="$DATABASE_URL" \
      SESSION_SECRET="$SESSION_SECRET" \
      NODE_ENV=production \
      NEXT_OUTPUT=standalone \
      PORT=8080 \
    -o none
  echo "  Container App updated."
else
  INIT_IMAGE="mcr.microsoft.com/k8se/quickstart:latest"
  echo "  Using placeholder image for initial creation: $INIT_IMAGE"
  echo "  (CI/CD will deploy the real app image on first push)"
  az containerapp create \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_ENV" \
    --image "$INIT_IMAGE" \
    --target-port 8080 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 5 \
    --cpu 1.0 \
    --memory 2.0Gi \
    --env-vars \
      DATABASE_URL="$DATABASE_URL" \
      SESSION_SECRET="$SESSION_SECRET" \
      NODE_ENV=production \
      NEXT_OUTPUT=standalone \
      PORT=8080 \
    --scale-rule-name http-scaling \
    --scale-rule-type http \
    --scale-rule-http-concurrency 50 \
    -o none

  echo "  Configuring ACR registry credentials..."
  az containerapp registry set \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --server "$ACR_LOGIN_SERVER" \
    --username "$ACR_USERNAME" \
    --password "$ACR_PASSWORD" \
    -o none
  echo "  Container App created with auto-scaling and ACR registry."
fi

echo ""
echo "[8/8] Retrieving Container App URL..."
CONTAINER_APP_URL=$(az containerapp show \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

SUBSCRIPTION_ID=$(az account show --query id -o tsv)

echo ""
echo "============================================"
echo " Setup Complete!"
echo "============================================"
echo ""
echo "Resources created in Azure UK South:"
echo "  Resource Group:      $RESOURCE_GROUP"
echo "  Container Registry:  $ACR_LOGIN_SERVER"
echo "  Container App:       https://${CONTAINER_APP_URL}"
echo "  PostgreSQL:          ${PG_SERVER_NAME}.postgres.database.azure.com"
echo "  Key Vault:           $KEYVAULT_NAME"
echo "  Log Analytics:       $LOG_ANALYTICS_NAME"
echo ""
echo "----------------------------------------------"
echo " SAVE THESE VALUES — you need them for GitHub"
echo "----------------------------------------------"
echo ""
echo "  ACR_LOGIN_SERVER=$ACR_LOGIN_SERVER"
echo "  ACR_USERNAME=$ACR_USERNAME"
echo "  ACR_PASSWORD=$ACR_PASSWORD"
echo "  DATABASE_URL=$DATABASE_URL"
echo "  CONTAINER_APP_URL=https://${CONTAINER_APP_URL}"
echo ""
echo "To create AZURE_CREDENTIALS for GitHub, run:"
echo "  az ad sp create-for-rbac --name gorigo-deploy --role contributor --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP --json-auth"
echo ""
echo "Add AI keys to Container App:"
echo "  az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars AI_INTEGRATIONS_OPENAI_API_KEY=<key> AI_INTEGRATIONS_ANTHROPIC_API_KEY=<key> AI_INTEGRATIONS_OPENROUTER_API_KEY=<key>"
echo ""
echo "Push to GitHub main branch to trigger deployment."
echo ""
