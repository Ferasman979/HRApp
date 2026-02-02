$ErrorActionPreference = "Stop"

# Configuration
$TfDir = "./infrastructure/terraform"
$RgName = "hr-app-rg-terraform"

Write-Host ">>> Starting Azure Deployment..." -ForegroundColor Green

# 1. Initialize Terraform
Write-Host "`n>>> 1. Initializing Terraform..." -ForegroundColor Cyan
Push-Location $TfDir
terraform init
if ($LASTEXITCODE -ne 0) { throw "Terraform init failed" }

# 2. Provision ACR Only (to allow image pushing)
Write-Host "`n>>> 2. Provisioning Azure Container Registry (Targeted Apply)..." -ForegroundColor Cyan
terraform apply -target="azurerm_container_registry.acr" -auto-approve
if ($LASTEXITCODE -ne 0) { throw "Terraform apply (ACR) failed" }

# Get ACR Login Server
$AcrServer = $(terraform output -raw acr_login_server 2>$null)
if ([string]::IsNullOrWhiteSpace($AcrServer)) {
    # Fallback to AZ CLI if output not available yet
    Write-Host "    Terraform output not ready. Fetching from Azure CLI..."
    $AcrServer = az acr list --resource-group $RgName --query "[0].loginServer" -o tsv
}
if ([string]::IsNullOrWhiteSpace($AcrServer)) {
     throw "Could not determine ACR Login Server. Please ensure the ACR was created manually or via the script."
}
Write-Host ">>> ACR Server: $AcrServer" -ForegroundColor Yellow

# 3. Build and Push Images
Write-Host "`n>>> 3. Logging into ACR..." -ForegroundColor Cyan
az acr login --name $AcrServer.Split(".")[0]

Pop-Location # Go back to root

function Build-And-Push {
    param($Context, $ImageName)
    $FullImage = "$AcrServer/$ImageName`:latest"
    Write-Host "    Building $FullImage..." -ForegroundColor Green
    docker build -t $FullImage $Context
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed for $ImageName" }
    
    Write-Host "    Pushing $FullImage..." -ForegroundColor Green
    docker push $FullImage
    if ($LASTEXITCODE -ne 0) { throw "Docker push failed for $ImageName" }
}

Write-Host "`n>>> 4. Building and Pushing Docker Images..." -ForegroundColor Cyan
Build-And-Push "./nextjs-hrapp-project" "hr-app-frontend"
Build-And-Push "./hr-agent-mcp" "hr-agent-mcp"
Build-And-Push "./monitoring/prometheus" "prometheus-custom"
Build-And-Push "./monitoring/tempo" "tempo-custom"
Build-And-Push "./monitoring/grafana" "grafana-custom"

# 4. Provision Everything Else
Write-Host "`n>>> 5. Provisioning Full Infrastructure..." -ForegroundColor Cyan
Push-Location $TfDir
terraform apply -auto-approve
if ($LASTEXITCODE -ne 0) { throw "Terraform apply (Full) failed" }
Pop-Location

Write-Host "`n>>> Deployment Complete!" -ForegroundColor Green
Write-Host "Use the Azure Portal to verify your Container Apps."
