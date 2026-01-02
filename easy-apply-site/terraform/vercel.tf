resource "vercel_project" "easy_apply" {
  name      = "easy-apply-site"
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = var.github_repo
  }
}

resource "vercel_project_environment_variable" "mongodb_uri" {
  project_id = vercel_project.easy_apply.id
  key        = "MONGODB_URI"
  # Using the user created in atlas.tf
  value      = replace(data.mongodbatlas_cluster.hr_db.connection_strings[0].standard_srv, "mongodb+srv://", "mongodb+srv://app-user:secure-password-CHANGE-ME@")
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "nextauth_secret" {
  project_id = vercel_project.easy_apply.id
  key        = "NEXTAUTH_SECRET"
  value      = "OQWssqZ5OYbwgTJexmbkOB+a0KtT04Pg8M3PqEmeS1I="
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "nextauth_url" {
  project_id = vercel_project.easy_apply.id
  key        = "NEXTAUTH_URL"
  value      = "https://${vercel_project.easy_apply.name}.vercel.app"
  target     = ["production", "preview", "development"]
}
