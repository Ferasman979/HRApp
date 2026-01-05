variable "rg_name" {
  description = "Name of the Azure Resource Group"
  type        = string
  default     = "hr-app-rg-terraform"
}

variable "location" {
  description = "Azure Region"
  type        = string
  default     = "canadacentral"
}

variable "acr_name" {
  description = "Name of the Azure Container Registry"
  type        = string
}

variable "env_name" {
  description = "Name of the Container Apps Environment"
  type        = string
  default     = "hr-app-env-terraform"
}

# --- SECRETS ---
variable "mongodb_uri" {
  description = "MongoDB Connection String"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "NextAuth Secret Key"
  type        = string
  sensitive   = true
}

variable "groq_api_key" {
  description = "API Key for Groq LLM"
  type        = string
  sensitive   = true
}

variable "llama_parse_api_key" {
  description = "API Key for LlamaParse"
  type        = string
  sensitive   = true
}
