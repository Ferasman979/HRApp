# Resume all Container Apps
echo "Starting HR App Frontend..."
az containerapp start --name hr-app-frontend --resource-group hr-app-rg

echo "Starting Processor Agent..."
az containerapp start --name hr-mcp-processor --resource-group hr-app-rg

echo "Starting Researcher Agent..."
az containerapp start --name hr-mcp-researcher --resource-group hr-app-rg

echo "All apps started. You are back in business!"
