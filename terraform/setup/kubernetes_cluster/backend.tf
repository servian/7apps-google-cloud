# Generated by Terragrunt. Sig: nIlQXj57tbuaRZEa
terraform {
  backend "gcs" {
    prefix = "setup/kubernetes_cluster/terraform.tfstate"
    bucket = "servian-labs-7apps-terraform-state"
  }
}
