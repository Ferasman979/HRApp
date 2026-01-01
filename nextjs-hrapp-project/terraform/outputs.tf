output "vercel_project_name" {
  value = vercel_project.hr_app.name
}

output "vercel_production_url" {
  value = "https://${vercel_project.hr_app.name}.vercel.app"
}

output "easy_apply_url" {
  value = "https://${vercel_project.easy_apply.name}.vercel.app"
}

output "mongodb_connection_string" {
  value     = data.mongodbatlas_cluster.hr_db.connection_strings[0].standard_srv
  sensitive = true
}
