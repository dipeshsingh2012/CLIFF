# Cloud Run v2 Service for CLIFF FastAPI Core Backend
resource "google_cloud_run_v2_service" "backend" {
  name     = "cliff-backend-${var.environment}"
  location = var.region
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cliff_sa.email

    scaling {
      min_instance_count = 0  # Scales to zero to eliminate idle server cost
      max_instance_count = 10 # Adjust as traffic grows
    }

    containers {
      image = var.backend_image

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GCP_REGION"
        value = var.region
      }

      env {
        name  = "GCS_RESUMES_BUCKET"
        value = google_storage_bucket.resumes.name
      }

      env {
        name  = "GCS_TAILORED_BUCKET"
        value = google_storage_bucket.tailored_resumes.name
      }

      env {
        name  = "SERVICE_ACCOUNT_EMAIL"
        value = google_service_account.cliff_sa.email
      }

      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image
    ]
  }

  depends_on = [
    google_project_service.apis
  ]
}

# Allow public invocations for the backend API
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

