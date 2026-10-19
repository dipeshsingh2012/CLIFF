output "cloud_run_url" {
  description = "The live HTTPS URL of the CLIFF backend API on Cloud Run"
  value       = google_cloud_run_v2_service.backend.uri
}

output "gcs_resumes_bucket" {
  description = "The GCS bucket for direct resume uploads"
  value       = google_storage_bucket.resumes.name
}

output "gcs_tailored_bucket" {
  description = "The GCS bucket for tailored resumes and cover letters"
  value       = google_storage_bucket.tailored_resumes.name
}

output "cloud_sql_connection_name" {
  description = "The Cloud SQL instance connection name (PROJECT_ID:REGION:INSTANCE_NAME)"
  value       = google_sql_database_instance.postgres.connection_name
}

output "service_account_email" {
  description = "The runtime Service Account email for CLIFF on Cloud Run"
  value       = google_service_account.cliff_sa.email
}

output "artifact_registry_repo" {
  description = "The Artifact Registry Docker repository for pushing CLIFF images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.cliff_repo.repository_id}"
}

output "pubsub_resume_uploaded_topic" {
  description = "Pub/Sub topic for GCS resume upload notifications"
  value       = google_pubsub_topic.resume_uploaded.name
}

output "pubsub_resume_analyzed_topic" {
  description = "Pub/Sub topic for completed resume analysis events"
  value       = google_pubsub_topic.resume_analyzed.name
}

