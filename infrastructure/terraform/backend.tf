terraform {
  backend "azurerm" {
    resource_group_name  = "hr-app-rg-terraform"
    storage_account_name = "hrapptfstate6977"   # Must be globally unique, will be created by script
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
