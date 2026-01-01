
# Azure Monitoring VM Setup Script (Hybrid Architecture)
# Provisions a B2s VM and installs Docker for Prometheus/Grafana

$RESOURCE_GROUP = "hr-app-rg"
$VM_NAME = "hr-monitoring-vm"
$LOCATION = "canadacentral"
$ADMIN_USERNAME = "azureuser"

# 1. Create VM (B2s - Burstable, 2 vCPU, 4GB RAM - Good for Prometheus)
# Note: User can stop this VM to save credits.
Write-Host "Creating Monitoring VM..."
az vm create `
  --resource-group $RESOURCE_GROUP `
  --name $VM_NAME `
  --image Ubuntu2204 `
  --size Standard_B2s `
  --admin-username $ADMIN_USERNAME `
  --generate-ssh-keys `
  --public-ip-sku Standard

# 2. Open Port 3000 (Grafana) and 9090 (Prometheus)
Write-Host "Opening Ports..."
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 3000 --priority 1010
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 9090 --priority 1020

# 3. Install Docker & Compose (via Custom Script Extension)
Write-Host "Installing Docker..."
az vm run-command invoke `
  --resource-group $RESOURCE_GROUP `
  --name $VM_NAME `
  --command-id RunShellScript `
  --scripts "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker $ADMIN_USERNAME && sudo apt-get install -y docker-compose-plugin"

# 4. Instructions for User
Write-Host "-------------------------------------------------------"
Write-Host "VM Created Successfully!"
Write-Host "To start monitoring:"
Write-Host "1. SSH into the VM: ssh $ADMIN_USERNAME@<PUBLIC_IP>"
Write-Host "2. Clone your repo or copy the 'monitoring' folder."
Write-Host "3. Run: docker compose up -d"
Write-Host "-------------------------------------------------------"
