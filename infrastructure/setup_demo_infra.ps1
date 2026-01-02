$ErrorActionPreference = "Stop"
$RG_NAME = "hr-app-rg-demo"
$LOCATION = "canadacentral"
$ACR_NAME = "hrappdemoredeploy" # New unique name
$ENV_NAME = "hr-app-env-demo"

# 1. Create Resource Group
Write-Host "Creating Resource Group '$RG_NAME'..."
az group create --name $RG_NAME --location $LOCATION

# 2. Create ACR
Write-Host "Creating ACR '$ACR_NAME'..."
az acr create --resource-group $RG_NAME --name $ACR_NAME --sku Basic --admin-enabled true

# 3. Create Environment (Required for Deployments)
Write-Host "Creating Container Apps Environment..."
az containerapp env create --name $ENV_NAME --resource-group $RG_NAME --location $LOCATION

Write-Host "Infrastructure Ready. Update your GitHub Workflow with:"
Write-Host "RG_NAME: $RG_NAME"
Write-Host "ACR_NAME: $ACR_NAME"
