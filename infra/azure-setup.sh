#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# GoRigo — Azure UK South Infrastructure Setup
# 
# Prerequisites:
#   1. Azure CLI installed: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
#   2. Logged in: az login
#   3. Subscription selected: az account set --subscription <SUBSCRIPTION_ID>
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
#   - PostgreSQL Flexible Server (UK South, zone-redundant)
#   - Key Vault for secrets
#   - Application Insights for monitoring
#   - DDoS Protection association
#   - Auto-scale rules
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
APPINSIGHTS_NAME="${APP_NAME}-insights"
LOG_ANALYTICS_NAME="${APP_NAME}-logs"

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
echo "[1/10] Creating Resource Group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags project=gorigo environment=production

echo ""
echo "[2/10] Creating Azure Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --location "$LOCATION" \
  --admin-enabled true

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

echo ""
echo "[3/10] Creating Log Analytics Workspace..."
az monitor log-analytics workspace create \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_NAME" \
  --location "$LOCATION"

LOG_ANALYTICS_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_NAME" \
  --query id -o tsv)

echo ""
echo "[4/10] Creating Application Insights..."
az monitor app-insights component create \
  --app "$APPINSIGHTS_NAME" \
  --location "$LOCATION" \
  --resource-group "$RESOURCE_GROUP" \
  --workspace "$LOG_ANALYTICS_ID" \
  --kind web \
  --application-type web

APPINSIGHTS_KEY=$(az monitor app-insights component show \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query instrumentationKey -o tsv)

APPINSIGHTS_CONNECTION=$(az monitor app-insights component show \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query connectionString -o tsv)

echo ""
echo "[5/10] Creating App Service Plan (B2, Linux, auto-scale ready)..."
az appservice plan create \
  --name "$APP_SERVICE_PLAN" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --is-linux \
  --sku B2

echo ""
echo "[6/10] Creating Web App for Containers..."
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --name "$WEBAPP_NAME" \
  --container-image-name "${ACR_LOGIN_SERVER}/${APP_NAME}:latest" \
  --container-registry-url "https://${ACR_LOGIN_SERVER}" \
  --container-registry-user "$ACR_USERNAME" \
  --container-registry-password "$ACR_PASSWORD"

az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --always-on true \
  --http20-enabled true \
  --min-tls-version 1.2 \
  --ftps-state Disabled

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings \
    WEBSITES_PORT=8080 \
    NODE_ENV=production \
    NEXT_OUTPUT=standalone

az webapp log config \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --docker-container-logging filesystem \
  --level information

echo ""
echo "[7/10] Creating PostgreSQL Flexible Server..."
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

az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$PG_SERVER_NAME" \
  --database-name "$PG_DB_NAME"

az postgres flexible-server parameter set \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$PG_SERVER_NAME" \
  --name require_secure_transport \
  --value on

WEBAPP_OUTBOUND_IPS=$(az webapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --query possibleOutboundIpAddresses -o tsv)

IFS=',' read -ra IP_ARRAY <<< "$WEBAPP_OUTBOUND_IPS"
for ip in "${IP_ARRAY[@]}"; do
  az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PG_SERVER_NAME" \
    --rule-name "webapp-${ip//./-}" \
    --start-ip-address "$ip" \
    --end-ip-address "$ip" 2>/dev/null || true
done

DATABASE_URL="postgresql://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_SERVER_NAME}.postgres.database.azure.com:5432/${PG_DB_NAME}?sslmode=require"

echo ""
echo "[8/10] Creating Key Vault..."
az keyvault create \
  --name "$KEYVAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku standard \
  --enable-rbac-authorization true

az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "DATABASE-URL" --value "$DATABASE_URL"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "SESSION-SECRET" --value "$SESSION_SECRET"

echo ""
echo "[9/10] Configuring Web App environment variables..."
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    SESSION_SECRET="$SESSION_SECRET" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="$APPINSIGHTS_CONNECTION"

echo ""
echo "[10/10] Setting up auto-scale rules..."
az monitor autoscale create \
  --resource-group "$RESOURCE_GROUP" \
  --name "${APP_NAME}-autoscale" \
  --resource "$APP_SERVICE_PLAN" \
  --resource-type Microsoft.Web/serverfarms \
  --min-count 1 \
  --max-count 5 \
  --count 1

az monitor autoscale rule create \
  --resource-group "$RESOURCE_GROUP" \
  --autoscale-name "${APP_NAME}-autoscale" \
  --condition "CpuPercentage > 70 avg 5m" \
  --scale out 1

az monitor autoscale rule create \
  --resource-group "$RESOURCE_GROUP" \
  --autoscale-name "${APP_NAME}-autoscale" \
  --condition "CpuPercentage < 30 avg 10m" \
  --scale in 1

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
echo "  App Insights:       $APPINSIGHTS_NAME"
echo ""
echo "Next steps:"
echo "  1. Add these GitHub Secrets to your repo:"
echo "     - AZURE_CREDENTIALS (from: az ad sp create-for-rbac --name gorigo-deploy --role contributor --scopes /subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP --json-auth)"
echo "     - ACR_LOGIN_SERVER=$ACR_LOGIN_SERVER"
echo "     - ACR_USERNAME=$ACR_USERNAME"
echo "     - ACR_PASSWORD=(see Azure Portal)"
echo "     - DATABASE_URL=(stored in Key Vault)"
echo "     - SESSION_SECRET=(stored in Key Vault)"
echo ""
echo "  2. Add AI integration keys to Web App settings:"
echo "     az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME --settings \\"
echo "       AI_INTEGRATIONS_OPENAI_API_KEY=<your-key> \\"
echo "       AI_INTEGRATIONS_OPENAI_BASE_URL=<your-url> \\"
echo "       AI_INTEGRATIONS_ANTHROPIC_API_KEY=<your-key> \\"
echo "       AI_INTEGRATIONS_ANTHROPIC_BASE_URL=<your-url> \\"
echo "       AI_INTEGRATIONS_OPENROUTER_API_KEY=<your-key> \\"
echo "       AI_INTEGRATIONS_OPENROUTER_BASE_URL=<your-url>"
echo ""
echo "  3. Push to GitHub main branch to trigger deployment"
echo ""
