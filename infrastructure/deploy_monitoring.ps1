$RG_NAME = "hr-app-rg"
$ENV_NAME = "hr-app-env"
$ACR_NAME = "hrappacrferas999"

# 0. Login to ACR
Write-Host "Logging into ACR..."
az acr login --name $ACR_NAME

# 1. Get URLs of existing services (PREDICTED to avoid circular dependency)
Write-Host "Fetching service URLs (Predicting based on Env Domain)..."

# Get Environment Default Domain
$ACA_DOMAIN = az containerapp env show --name $ENV_NAME --resource-group $RG_NAME --query properties.defaultDomain -o tsv

if (-not $ACA_DOMAIN) { Write-Error "Could not find Container App Environment Domain"; exit 1 }

$FRONTEND_URL = "hr-app-frontend.$ACA_DOMAIN"
$PROCESSOR_URL = "hr-mcp-processor.$ACA_DOMAIN"
$RESEARCHER_URL = "hr-mcp-researcher.$ACA_DOMAIN"

Write-Host "Environment Domain: $ACA_DOMAIN"
Write-Host "Frontend: $FRONTEND_URL"
Write-Host "Processor: $PROCESSOR_URL"
Write-Host "Researcher: $RESEARCHER_URL"

# 2. Update Prometheus Config
Write-Host "Updating prometheus.yml..."
$content = Get-Content "monitoring/prometheus/prometheus.template.yml" -Raw
$content = $content -replace "__FRONTEND_HOST__", $FRONTEND_URL
$content = $content -replace "__PROCESSOR_HOST__", $PROCESSOR_URL
$content = $content -replace "__RESEARCHER_HOST__", $RESEARCHER_URL
Set-Content "monitoring/prometheus/prometheus.yml" $content

# 3. Build Prometheus Image
Write-Host "Building Prometheus Docker Image..."
# We use the generated prometheus.yml in the build
az acr build --registry $ACR_NAME --image prometheus-custom:latest "monitoring/prometheus"

# 4. Deploy Prometheus Container App
Write-Host "Deploying Prometheus..."
az containerapp create `
  --name hr-app-prometheus `
  --resource-group $RG_NAME `
  --environment $ENV_NAME `
  --image "$ACR_NAME.azurecr.io/prometheus-custom:latest" `
  --registry-server "$ACR_NAME.azurecr.io" `
  --target-port 9090 `
  --ingress external `
  --query properties.configuration.ingress.fqdn

$PROMETHEUS_URL = $(az containerapp show --name hr-app-prometheus --resource-group $RG_NAME --query properties.configuration.ingress.fqdn -o tsv)
Write-Host "Prometheus is running at https://$PROMETHEUS_URL"


# 5. Build Grafana Image (Provisioning)
Write-Host "Building Grafana Docker Image..."
$grafanaContent = Get-Content "monitoring/grafana/datasources.template.yml" -Raw
$grafanaContent = $grafanaContent -replace "__PROMETHEUS_URL__", "https://$PROMETHEUS_URL"
Set-Content "monitoring/grafana/datasources.yml" $grafanaContent

# Files are already in monitoring/grafana, which is the build context.
Write-Host "Dashboards ready in build context."



az acr build --registry $ACR_NAME --image grafana-custom:latest "monitoring/grafana"

# 6. Deploy Grafana Container App
Write-Host "Deploying Grafana..."
# Note: Using custom image now
az containerapp update `
  --name hr-app-grafana `
  --resource-group $RG_NAME `
  --image "$ACR_NAME.azurecr.io/grafana-custom:latest" `
  --set-env-vars `
    GF_SECURITY_ALLOW_EMBEDDING=true `
    GF_AUTH_ANONYMOUS_ENABLED=true `
    GF_AUTH_ANONYMOUS_ORG_ROLE=Admin `
    GF_AUTH_DISABLE_LOGIN_FORM=false



$GRAFANA_URL = $(az containerapp show --name hr-app-grafana --resource-group $RG_NAME --query properties.configuration.ingress.fqdn -o tsv)
Write-Host "Grafana is running at https://$GRAFANA_URL"

# 6. Update Frontend with Grafana URL
# Write-Host "Updating Frontend Env Var..."
# az containerapp update --name hr-app-frontend --resource-group $RG_NAME --set-env-vars NEXT_PUBLIC_GRAFANA_URL="https://$GRAFANA_URL"

Write-Host "Done! Setup complete."
Write-Host "1. Login to Grafana: https://$GRAFANA_URL (admin/admin123)"
Write-Host "2. Add Prometheus Data Source: https://$PROMETHEUS_URL"
Write-Host "3. Import Dashboard."
