# 1. Frontend App
resource "azurerm_container_app" "frontend" {
  name                         = "hr-app-frontend"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name   = "frontend"
      image  = "${azurerm_container_registry.acr.login_server}/hr-app-frontend:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "MONGODB_URI"
        value = var.mongodb_uri
      }
      env {
        name  = "NEXTAUTH_SECRET"
        value = var.nextauth_secret
      }
      env {
        name  = "NEXT_PUBLIC_GRAFANA_URL"
        value = "https://${azurerm_container_app.grafana.ingress[0].fqdn}"
      }
      env {
        name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
        value = "http://hr-app-collector:4317"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      percentage = 100
      latest_revision = true
    }
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }
}

# 2. Processor Agent
resource "azurerm_container_app" "processor" {
  name                         = "hr-mcp-processor"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name    = "processor"
      image   = "${azurerm_container_registry.acr.login_server}/hr-agent-mcp:latest"
      command = ["npm", "run", "worker"]
      cpu     = 0.25
      memory  = "0.5Gi"

      env {
        name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
        value = "http://hr-app-collector:4317"
      }

      env {
        name  = "MONGODB_URI"
        value = var.mongodb_uri
      }
      env {
        name  = "GROQ_API_KEY"
        value = var.groq_api_key
      }
      env {
        name  = "LLAMA_PARSE_API_KEY"
        value = var.llama_parse_api_key
      }
    }
  }
  
  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }
}

# 3. Researcher Agent
resource "azurerm_container_app" "researcher" {
  name                         = "hr-mcp-researcher"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name    = "researcher"
      image   = "${azurerm_container_registry.acr.login_server}/hr-agent-mcp:latest"
      command = ["npm", "run", "research"]
      cpu     = 0.5
      memory  = "1.0Gi"

      env {
        name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
        value = "http://hr-app-collector:4317"
      }

      env {
        name  = "MONGODB_URI"
        value = var.mongodb_uri
      }
      env {
        name  = "GROQ_API_KEY"
        value = var.groq_api_key
      }
      env {
        name  = "LLAMA_PARSE_API_KEY"
        value = var.llama_parse_api_key
      }
    }
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }
}

# 4. Grafana (Simplified for Terraform)
# Note: Real-world Grafana usually needs volume mounts for persistence.
resource "azurerm_container_app" "grafana" {
  name                         = "hr-app-grafana"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name   = "grafana"
      image  = "${azurerm_container_registry.acr.login_server}/grafana-custom:latest" # Assumes already built
      cpu    = 0.25
      memory = "0.5Gi"
      
      env {
        name  = "GF_SECURITY_ALLOW_EMBEDDING"
        value = "true"
      }
      env {
        name  = "GF_AUTH_ANONYMOUS_ENABLED"
        value = "true"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      percentage = 100
      latest_revision = true
    }
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }
}

# 5. Tempo (Trace Backend)
resource "azurerm_container_app" "tempo" {
  name                         = "hr-app-tempo"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name   = "tempo"
      image  = "${azurerm_container_registry.acr.login_server}/tempo-custom:latest"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = false # Internal only
    target_port      = 4317 # Change from 3200 to 4317 to match gRPC OTLP listener
    transport        = "tcp"
    traffic_weight {
      percentage = 100
      latest_revision = true
    }
  }
  
  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }
}

# 6. OpenTelemetry Collector (Custom Image)
resource "azurerm_container_app" "otel_collector" {
  name                         = "hr-app-collector"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name   = "collector"
      image  = "${azurerm_container_registry.acr.login_server}/otel-collector-custom:latest"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = false # Internal only? Or expose for local dev?
    target_port      = 4317 # GRPC OTLP
    transport        = "tcp"
    traffic_weight {
      percentage = 100
      latest_revision = true
    }
    # Also listens on 4318 HTTP
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }
}
