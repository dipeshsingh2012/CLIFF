# Secret Manager: Stores Neon PostgreSQL DATABASE_URL connection string
resource "google_secret_manager_secret" "database_url_secret" {
  secret_id = "cliff-database-url-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url_version" {
  secret      = google_secret_manager_secret.database_url_secret.id
  secret_data = var.database_url
}

# Grant Secret Manager access to Cloud Run Service Account
resource "google_secret_manager_secret_iam_member" "sa_secret_access" {
  secret_id = google_secret_manager_secret.database_url_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cliff_sa.email}"
}


