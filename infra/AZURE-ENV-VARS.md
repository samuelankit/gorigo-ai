# GoRigo — Azure Environment Variables Reference

## Required GitHub Repository Secrets

Set these in your GitHub repo under **Settings > Secrets and Variables > Actions**.

| Secret Name | Description | How to Get |
|---|---|---|
| `AZURE_CREDENTIALS` | Service principal JSON for Azure login | `az ad sp create-for-rbac --name gorigo-deploy --role contributor --scopes /subscriptions/<SUB_ID>/resourceGroups/gorigo-rg --json-auth` |
| `ACR_LOGIN_SERVER` | Container registry URL | `az acr show --name gorigoacr --query loginServer -o tsv` |
| `ACR_USERNAME` | Container registry username | `az acr credential show --name gorigoacr --query username -o tsv` |
| `ACR_PASSWORD` | Container registry password | Azure Portal > Container Registry > Access keys |
| `DATABASE_URL` | PostgreSQL connection string | From `azure-setup.sh` output or Key Vault |
| `SESSION_SECRET` | Express session secret | Any secure random string (32+ chars) |

## Azure Web App Settings

Set via Azure Portal or CLI. These are configured automatically by `azure-setup.sh`.

### Core Application

| Setting | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `NEXT_OUTPUT` | `standalone` | Required for Docker deployment |
| `WEBSITES_PORT` | `8080` | Container listens on 8080 |
| `DATABASE_URL` | `postgresql://...` | Azure PostgreSQL connection string with `?sslmode=require` |
| `SESSION_SECRET` | `<random>` | Session encryption key |

### AI Integration Keys

These must be added manually after running `azure-setup.sh`:

| Setting | Description |
|---|---|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL (if using proxy) |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic base URL (if using proxy) |
### Monitoring

| Setting | Value |
|---|---|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Auto-set by `azure-setup.sh` |

## Setting AI Keys via CLI

```bash
az webapp config appsettings set \
  --resource-group gorigo-rg \
  --name gorigo-app \
  --settings \
    AI_INTEGRATIONS_OPENAI_API_KEY="sk-..." \
    AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-..."
```

## Verifying Configuration

```bash
# List all app settings
az webapp config appsettings list \
  --resource-group gorigo-rg \
  --name gorigo-app \
  --output table

# Check container logs
az webapp log tail \
  --resource-group gorigo-rg \
  --name gorigo-app

# Test health endpoint
curl https://gorigo-app.azurewebsites.net/api/health
```
