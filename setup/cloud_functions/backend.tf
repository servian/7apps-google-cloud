# Generated by Terragrunt. Sig: nIlQXj57tbuaRZEa
terraform {
  backend "gcs" {
    bucket = "servian-labs-7apps-terraform-state"
    prefix = "cloud_functions/terraform.tfstate"
  }
}
