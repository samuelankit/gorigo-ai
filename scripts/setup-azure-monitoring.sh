#!/bin/bash
# ============================================================================
# GoRigo Azure Monitoring & Alerts Setup Script
# ============================================================================
#
# Usage:
#   chmod +x scripts/setup-azure-monitoring.sh
#   ./scripts/setup-azure-monitoring.sh
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Contributor access to the gorigo-rg resource group
#   - The Container App gorigo-app must already be deployed
#
# This script creates:
#   1. An action group for email notifications
#   2. CPU usage alert (>80% for 5 minutes)
#   3. Memory usage alert (>80% for 5 minutes)
#   4. HTTP 5xx error rate alert (>5 errors in 5 minutes)
#   5. Response latency alert (>3000ms average for 5 minutes)
#   6. Container restart alert
#
# All alerts target the GoRigo production Container App in Azure UK South.
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
RESOURCE_GROUP="gorigo-rg"
LOCATION="uksouth"
RESOURCE_ID="/subscriptions/5130f669-2d12-4383-a080-bb80ff0e41bd/resourceGroups/gorigo-rg/providers/Microsoft.App/containerapps/gorigo-app"
ALERT_EMAIL="gorigo.ai@hotmail.com"
ACTION_GROUP_NAME="gorigo-alerts-ag"
ACTION_GROUP_SHORT="GorigoAlrt"

echo "============================================"
echo " GoRigo Azure Monitoring Setup"
echo "============================================"
echo ""
echo "Resource Group : $RESOURCE_GROUP"
echo "Location       : $LOCATION"
echo "Resource       : $RESOURCE_ID"
echo "Alert Email    : $ALERT_EMAIL"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Create Action Group for email notifications
# ---------------------------------------------------------------------------
echo "[1/6] Creating action group: $ACTION_GROUP_NAME ..."
az monitor action-group create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACTION_GROUP_NAME" \
  --short-name "$ACTION_GROUP_SHORT" \
  --location "$LOCATION" \
  --action email gorigo-admin "$ALERT_EMAIL" \
  --output none

ACTION_GROUP_ID=$(az monitor action-group show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACTION_GROUP_NAME" \
  --query id \
  --output tsv)

echo "  Action group created: $ACTION_GROUP_ID"
echo ""

# ---------------------------------------------------------------------------
# Step 2: CPU Usage Alert (>80% for 5 minutes)
# ---------------------------------------------------------------------------
echo "[2/6] Creating CPU usage alert (>80% for 5 minutes) ..."
az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "gorigo-cpu-high" \
  --description "Alert when CPU usage exceeds 80% for 5 minutes on gorigo-app" \
  --scopes "$RESOURCE_ID" \
  --condition "avg UsageNanoCores > 800000000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  CPU usage alert created."
echo ""

# ---------------------------------------------------------------------------
# Step 3: Memory Usage Alert (>80% for 5 minutes)
# ---------------------------------------------------------------------------
echo "[3/6] Creating memory usage alert (>80% for 5 minutes) ..."
az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "gorigo-memory-high" \
  --description "Alert when memory working set exceeds 80% for 5 minutes on gorigo-app" \
  --scopes "$RESOURCE_ID" \
  --condition "avg WorkingSetBytes > 858993459" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  Memory usage alert created."
echo ""

# ---------------------------------------------------------------------------
# Step 4: HTTP 5xx Error Rate Alert (>5 errors in 5 minutes)
# ---------------------------------------------------------------------------
echo "[4/6] Creating HTTP 5xx error rate alert (>5 in 5 minutes) ..."
az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "gorigo-5xx-errors" \
  --description "Alert when HTTP 5xx errors exceed 5 in a 5-minute window on gorigo-app" \
  --scopes "$RESOURCE_ID" \
  --condition "total Requests > 5 where StatusCodeCategory includes 5xx" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  HTTP 5xx error rate alert created."
echo ""

# ---------------------------------------------------------------------------
# Step 5: Response Latency Alert (>3000ms average for 5 minutes)
# ---------------------------------------------------------------------------
echo "[5/6] Creating response latency alert (>3000ms avg for 5 minutes) ..."
az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "gorigo-latency-high" \
  --description "Alert when average response latency exceeds 3000ms for 5 minutes on gorigo-app" \
  --scopes "$RESOURCE_ID" \
  --condition "avg RequestDuration > 3000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  Response latency alert created."
echo ""

# ---------------------------------------------------------------------------
# Step 6: Container Restart Alert
# ---------------------------------------------------------------------------
echo "[6/6] Creating container restart alert ..."
az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "gorigo-container-restarts" \
  --description "Alert when container restarts are detected on gorigo-app" \
  --scopes "$RESOURCE_ID" \
  --condition "total RestartCount > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  Container restart alert created."
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "============================================"
echo " All monitoring alerts configured!"
echo "============================================"
echo ""
echo " Action Group : $ACTION_GROUP_NAME ($ALERT_EMAIL)"
echo " Alerts:"
echo "   - gorigo-cpu-high          : CPU > 80% for 5 min (Sev 2)"
echo "   - gorigo-memory-high       : Memory > 80% for 5 min (Sev 2)"
echo "   - gorigo-5xx-errors        : 5xx errors > 5 in 5 min (Sev 1)"
echo "   - gorigo-latency-high      : Avg latency > 3000ms for 5 min (Sev 2)"
echo "   - gorigo-container-restarts: Any restart detected (Sev 1)"
echo ""
echo " View alerts:  az monitor metrics alert list -g $RESOURCE_GROUP -o table"
echo " Delete all:   az monitor metrics alert delete -g $RESOURCE_GROUP -n <alert-name>"
echo ""
