output "easy_apply_project_name" {
  value = vercel_project.easy_apply.name
}

output "easy_apply_production_url" {
  value = "https://${vercel_project.easy_apply.name}.vercel.app"
}

output "mongodb_connection_string" {
  value     = data.mongodbatlas_cluster.hr_db.connection_strings[0].standard_srv
  sensitive = true
}
