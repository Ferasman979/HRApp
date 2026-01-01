# We will use the EXISTING Project ID provided in variables.tf
# resource "mongodbatlas_project" "hr_project" { ... }

# DATA SOURCE: Read the EXISTING Cluster instead of creating a new one
data "mongodbatlas_cluster" "hr_db" {
  project_id = var.atlas_project_id
  name       = var.atlas_cluster_name
}

# Create a Database User
resource "mongodbatlas_database_user" "db_user" {
  username           = "app-user"
  password           = "secure-password-CHANGE-ME" # Use a variable in real usage
  project_id         = var.atlas_project_id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "hrapp"
  }
}

# Allow Access from Vercel (All IPs)
resource "mongodbatlas_project_ip_access_list" "allow_all" {
  project_id = var.atlas_project_id
  cidr_block = "0.0.0.0/0"
  comment    = "Allow Vercel access"
}
