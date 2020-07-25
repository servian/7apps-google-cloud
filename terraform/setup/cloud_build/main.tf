
# Build Docker container so the image is available to other services when
#  they're first created.

resource "null_resource" "initial_container_build" {
  provisioner "local-exec" {
    working_dir = var.app_dir
    command     = <<EOT
    gcloud builds submit \
      --config cloudbuild.container.yaml \
      --substitutions="SHORT_SHA=latest,_IMAGE_NAME=${var.image_name}"
EOT
  }
}

resource "google_cloudbuild_trigger" "deploy" {
  provider = google-beta
  project  = var.project_id
  name     = "7-APPS-DEPLOYMENT"

  ignored_files = ["dashboard/**", "docs/**", "terraform/**"]
  filename      = "app/cloudbuild.yaml"

  substitutions = {
    _REGION                = var.region
    _ZONE                  = var.zone
    _IMAGE_NAME            = split("/", var.image_name, )[2]
    _CLOUD_RUN_NAME        = var.services.cloud_run.name
    _CLOUD_RUN_ANTHOS_NAME = var.services.cloud_run_anthos.name
    _FUNCTION_NAME         = var.services.cloud_function.name
    _GCE_INSTANCE          = var.services.compute_engine.name
    _GCE_DOMAIN            = var.services.compute_engine.domain
    _GKE_CLUSTER           = var.kubernetes_cluster_name
    _GKE_APP_NAME          = var.services.kubernetes_engine.name
    _GKE_DOMAIN            = var.services.kubernetes_engine.domain
  }

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = var.github_branch
    }
  }
}

/* IAM ---------------------------------------------------------------------- */

# Give Cloud Build perimssion to deploy and do anything 🤪

resource "google_project_iam_member" "project" {
  for_each = toset(["roles/editor", "roles/iap.tunnelResourceAccessor"])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

/* Logging ------------------------------------------------------------------ */

# Export all Cloud Build logs from Stackdriver to Pub/Sub

resource "google_pubsub_topic" "logs" {
  project = var.project_id
  name    = "cloud-build-logs"
}

resource "google_logging_project_sink" "logs" {
  project = var.project_id
  name    = "cloud-build-log-sink"

  destination = "pubsub.googleapis.com/${google_pubsub_topic.logs.id}"
  filter      = "resource.type=\"build\" logName=\"projects/${var.project_id}/logs/cloudbuild\""

  unique_writer_identity = true
}

resource "google_pubsub_topic_iam_binding" "logs" {
  project = google_pubsub_topic.logs.project
  topic   = google_pubsub_topic.logs.name
  role    = "roles/editor"
  members = [
    google_logging_project_sink.logs.writer_identity
  ]
}
