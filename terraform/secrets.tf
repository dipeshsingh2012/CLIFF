# Secret Manager: Stores Cloud SQL credentials and signing keys
resource "google_secret_manager_secret" "db_password_secret" {
  secret_id = "cliff-db-password-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password_secret.id
  secret_data = random_password.db_password.result
}

# Grant Secret Manager access to Cloud Run Service Account
resource "google_secret_manager_secret_iam_member" "sa_secret_access" {
  secret_id = google_secret_manager_secret.db_password_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cliff_sa.email}"
}

