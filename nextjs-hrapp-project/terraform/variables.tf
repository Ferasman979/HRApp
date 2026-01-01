variable "vercel_api_token" {
  description = "API Token for Vercel"
  type        = string
  sensitive   = true
}

variable "atlas_public_key" {
  description = "Public API Key for MongoDB Atlas"
  type        = string
  sensitive   = true
}

variable "atlas_private_key" {
  description = "Private API Key for MongoDB Atlas"
  type        = string
  sensitive   = true
}

variable "atlas_org_id" {
  description = "Organization ID for MongoDB Atlas"
  type        = string
}

variable "atlas_project_id" {
  description = "Project ID for MongoDB Atlas (if using existing project)"
  type        = string
  default     = ""
}

variable "atlas_cluster_name" {
  description = "Name of the EXISTING MongoDB Cluster (e.g. Cluster0)"
  type        = string
  default     = "Cluster0"
}

variable "github_repo" {
  description = "GitHub repository (username/repo)"
  type        = string
  default     = "feras-example/hr-app" # UPDATE THIS
}

variable "easy_apply_repo" {
  description = "GitHub repo for the public site (username/repo)"
  type        = string
  default     = "Ferasman979/EasyApply-Site" # User needs to create this
}
