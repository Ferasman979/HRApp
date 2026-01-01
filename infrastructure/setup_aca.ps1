
# Azure Container Apps Setup Script
# Run this from your local machine (Azure CLI and Docker required)

$RESOURCE_GROUP = "hr-app-rg"
$LOCATION = "canadacentral"
$ACR_NAME = "hrappacrferas999" # Must be globally unique
$ENV_NAME = "hr-app-env"

# 1. Create Resource Group
Write-Host "Creating Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Create Container Registry (Basic Tier - Cheapest)
Write-Host "Creating Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

# Get ACR Credentials
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv
$ACR_SERVER = "$ACR_NAME.azurecr.io"

# Write-Host "Please authenticate Docker..."
# docker login $ACR_SERVER -u $ACR_NAME -p $ACR_PASSWORD

# 3. Build & Push Images (Skipped - Handled by GitHub Actions)
# Write-Host "Building & Pushing Frontend..."
# cd ../nextjs-hrapp-project
# docker build -t "$ACR_SERVER/hrapp:latest" .
# docker push "$ACR_SERVER/hrapp:latest"

# Write-Host "Building & Pushing Worker..."
# cd ../hr-agent-mcp
# docker build -t "$ACR_SERVER/mcp-agent:latest" .
# docker push "$ACR_SERVER/mcp-agent:latest"

# 4. Create Container Apps Environment (Consumption Tier)
Write-Host "Creating Container Apps Environment..."
az containerapp env create --name $ENV_NAME --resource-group $RESOURCE_GROUP --location $LOCATION

# 5. Create FRONTEND App
Write-Host "Creating Frontend App..."
az containerapp create `
  --name "hr-app-frontend" `
  --resource-group $RESOURCE_GROUP `
  --environment $ENV_NAME `
  --image "mcr.microsoft.com/k8se/quickstart:latest" `
  --target-port 3000 `
  --ingress 'external' `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_NAME `
  --registry-password $ACR_PASSWORD `
  --min-replicas 0 `
  --max-replicas 2 `
  --cpu 0.25 --memory 0.5Gi `
  --env-vars "MONGODB_URI=REPLACE_ME" "NEXTAUTH_SECRET=REPLACE_ME" "NEXTAUTH_URL=https://hr-app-frontend.azurecontainerapps.io"

# 6. Create PROCESSOR App (Agent 1)
# Note: Using Scale Rule for MongoDB here is complex without KEDA scaler connection string secret.
# For prototype, we'll set min-replicas 1 or rely on HTTP scaling if we switch to HTTP-trigger.
# For $0, min-replicas 0 is needed, but we need an event trigger.
# Simplified approach: Always on for demo phase (min-replicas 1) OR use a timer trigger.
# To keep strictly $0: We'd need KEDA Mongo scaler.
Write-Host "Creating Processor App..."
az containerapp create `
  --name "hr-mcp-processor" `
  --resource-group $RESOURCE_GROUP `
  --environment $ENV_NAME `
  --image "mcr.microsoft.com/k8se/quickstart:latest" `
  --command "npm" "run" "worker" `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_NAME `
  --registry-password $ACR_PASSWORD `
  --min-replicas 1 `
  --max-replicas 1 `
  --cpu 0.25 --memory 0.5Gi `
  --env-vars "MONGODB_URI=REPLACE_ME" "GROQ_API_KEY=REPLACE_ME" "GROQ_MODEL=llama-3.3-70b-versatile"

# 7. Create RESEARCHER App (Agent 2)
Write-Host "Creating Researcher App..."
az containerapp create `
  --name "hr-mcp-researcher" `
  --resource-group $RESOURCE_GROUP `
  --environment $ENV_NAME `
  --image "mcr.microsoft.com/k8se/quickstart:latest" `
  --command "npm" "run" "research" `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_NAME `
  --registry-password $ACR_PASSWORD `
  --min-replicas 1 `
  --max-replicas 1 `
  --cpu 0.25 --memory 0.5Gi `
  --env-vars "MONGODB_URI=REPLACE_ME" "GROQ_API_KEY=REPLACE_ME" "GROQ_MODEL=llama-3.3-70b-versatile"

Write-Host "Setup Complete! Update Environment Variables in Azure Portal."
