resource "vercel_project" "hr_app" {
  name      = "nextjs-hr-app"
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = var.github_repo
  }
}

resource "vercel_project_environment_variable" "mongodb_uri" {
  project_id = vercel_project.hr_app.id
  key        = "MONGODB_URI"
  # Construct a proper URI with credentials
  # Format: mongodb+srv://USER:PASS@HOST/DB?authSource=admin
  value      = "mongodb+srv://${mongodbatlas_database_user.db_user.username}:${mongodbatlas_database_user.db_user.password}@${replace(data.mongodbatlas_cluster.hr_db.connection_strings[0].standard_srv, "mongodb+srv://", "")}/hrapp?retryWrites=true&w=majority&authSource=admin"
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "nextauth_secret" {
  project_id = vercel_project.hr_app.id
  key        = "NEXTAUTH_SECRET"
  value      = "generate-a-secure-random-string-here" # In prod, use a variable or secret manager
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "nextauth_url" {
  project_id = vercel_project.hr_app.id
  key        = "NEXTAUTH_URL"
  value      = "https://${vercel_project.hr_app.name}.vercel.app" # Dynamically points to the vercel domain
  target     = ["production", "preview", "development"]
}

# ==============================================================================
# SECOND PROJECT: The Public "EasyApply" Site
# ==============================================================================

resource "vercel_project" "easy_apply" {
  name      = "easy-apply-site"
  framework = "nextjs"
  
  # WORKAROUND: We will connect Git manually in Vercel Dashboard
  # git_repository = {
  #   type = "github"
  #   repo = var.easy_apply_repo
  # }
}

resource "vercel_project_environment_variable" "easy_apply_mongo" {
  project_id = vercel_project.easy_apply.id
  key        = "MONGODB_URI"
  # SHARE THE SAME DATABASE with explicit credentials
  value      = "mongodb+srv://${mongodbatlas_database_user.db_user.username}:${mongodbatlas_database_user.db_user.password}@${replace(data.mongodbatlas_cluster.hr_db.connection_strings[0].standard_srv, "mongodb+srv://", "")}/hrapp?retryWrites=true&w=majority&authSource=admin"
  target     = ["production", "preview", "development"]
}
