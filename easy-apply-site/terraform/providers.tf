terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "mongodbatlas" {
  public_key  = var.atlas_public_key
  private_key = var.atlas_private_key
}
