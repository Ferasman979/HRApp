# Pause all Container Apps (Stops Billing for Compute)
echo "Stopping HR App Frontend..."
az containerapp stop --name hr-app-frontend --resource-group hr-app-rg

echo "Stopping Processor Agent..."
az containerapp stop --name hr-mcp-processor --resource-group hr-app-rg

echo "Stopping Researcher Agent..."
az containerapp stop --name hr-mcp-researcher --resource-group hr-app-rg

echo "All apps stopped. Compute billing is paused."
