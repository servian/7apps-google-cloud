# Generated by Terragrunt. Sig: nIlQXj57tbuaRZEa
terraform {
  backend "gcs" {
    prefix = "cloud_run_anthos/terraform.tfstate"
    bucket = "servian-labs-7apps-terraform-state"
  }
}