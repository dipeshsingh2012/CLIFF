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
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.postgres.connection_name
      }

      env {
        name  = "DB_NAME"
        value = var.db_name
      }

      env {
        name  = "DB_USER"
        value = var.db_user
      }

      # Mount Cloud SQL password securely from Secret Manager
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_secret.secret_id
            version = "latest"
          }
        }
      }

      # Cloud SQL Unix Socket Volume Mount
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
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
    google_project_service.apis,
    google_sql_database.cliff,
    google_sql_user.app_user,
    google_secret_manager_secret_iam_member.sa_secret_access
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

