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

# ------------------------------------------------------------------
# 2. Provision ACR Only (to allow image pushing)
# ... (Assuming ACR step is done above) ...

Pop-Location # Go back to root (Exit Terraform dir after Step 2)

# 3. Build and Push Images via ACR Tasks (No Docker Desktop required)
# ------------------------------------------------------------------
Write-Host "`n>>> 3. Building Images in Azure (ACR Tasks)..." -ForegroundColor Cyan
Write-Host "Using 'az acr build' to build images in the cloud. This avoids local Docker dependencies."

function Build-ACR-Task {
    param($Context, $ImageName)
    $FullImage = "$ImageName`:latest"
    Write-Host "    Building and Pushing $FullImage to $AcrServer..." -ForegroundColor Green
    
    # Run ACR Build
    az acr build --registry $AcrServer.Split(".")[0] --image $FullImage $Context
    
    if ($LASTEXITCODE -ne 0) { throw "ACR Build failed for $ImageName" }
}

# Application Images
Build-ACR-Task "./nextjs-hrapp-project" "hr-app-frontend"
Build-ACR-Task "./hr-agent-mcp" "hr-agent-mcp"

# Monitoring Images
Build-ACR-Task "./monitoring/prometheus" "prometheus-custom"
Build-ACR-Task "./monitoring/tempo" "tempo-custom"
Build-ACR-Task "./monitoring/grafana" "grafana-custom"



# 4. Provision Everything Else
Write-Host "`n>>> 5. Provisioning Full Infrastructure..." -ForegroundColor Cyan
Push-Location $TfDir
terraform apply -auto-approve
if ($LASTEXITCODE -ne 0) { throw "Terraform apply (Full) failed" }
Pop-Location

Write-Host "`n>>> Deployment Complete!" -ForegroundColor Green
Write-Host "Use the Azure Portal to verify your Container Apps."
