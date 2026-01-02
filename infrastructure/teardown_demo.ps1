# Teardown Demo Infrastructure
$RG_NAME = "hr-app-rg-demo"

Write-Host "Teardown initiated for Resource Group: $RG_NAME"

# Check if logged in
$account = az account show --output json | ConvertFrom-Json
if ($null -eq $account) {
    Write-Error "Not logged in to Azure. Please run 'az login' first."
    exit 1
}

Write-Host "Deleting Resource Group '$RG_NAME' (Background operation)..."
az group delete --name $RG_NAME --yes --no-wait

if ($LASTEXITCODE -eq 0) {
    Write-Host "Delete command sent successfully. The resource group will be deleted in the background."
} else {
    Write-Error "Failed to initiate delete command."
}
