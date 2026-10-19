# Google Cloud Pub/Sub & Storage Notification Infrastructure for Event-Driven Ingestion

# 1. Fetch default Google Cloud Storage Service Account to authorize Pub/Sub publishing
data "google_storage_project_service_account" "gcs_account" {
  project = var.project_id
}

# 2. Topic: Fired when resume raw document lands in GCS bucket
resource "google_pubsub_topic" "resume_uploaded" {
  name    = "cliff-resume-uploaded-${var.environment}"
  project = var.project_id

  depends_on = [google_project_service.apis]
}

# Grant GCS service account permission to publish to the resume_uploaded topic
resource "google_pubsub_topic_iam_member" "gcs_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.resume_uploaded.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
}

# 3. GCS Bucket Notification (OBJECT_FINALIZE on resumes/ prefix)
resource "google_storage_notification" "resume_upload_notification" {
  bucket             = google_storage_bucket.resumes.name
  payload_format     = "JSON_API_V1"
  topic              = google_pubsub_topic.resume_uploaded.id
  event_types        = ["OBJECT_FINALIZE"]
  object_name_prefix = "resumes/"

  depends_on = [
    google_pubsub_topic_iam_member.gcs_publisher,
    google_project_service.apis
  ]
}


# 4. Topic: Fired when AI extraction & analysis completes
resource "google_pubsub_topic" "resume_analyzed" {
  name    = "cliff-resume-analyzed-${var.environment}"
  project = var.project_id

  depends_on = [google_project_service.apis]
}

# 5. Push Subscription: Delivers GCS upload events to Worker Endpoint
resource "google_pubsub_subscription" "resume_uploaded_sub" {
  name    = "cliff-resume-uploaded-sub-${var.environment}"
  topic   = google_pubsub_topic.resume_uploaded.id
  project = var.project_id

  ack_deadline_seconds = 300 # 5 minutes for Vertex AI processing

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.backend.uri}/api/internal/events/resume-uploaded"

    oidc_token {
      service_account_email = google_service_account.cliff_sa.email
      audience              = google_cloud_run_v2_service.backend.uri
    }
  }

  retry_policy {
    minimum_backoff = "5s"
    maximum_backoff = "60s"
  }

  depends_on = [google_project_service.apis]
}

# 6. Push Subscription: Delivers Analysis Output to Core Service Database Updater
resource "google_pubsub_subscription" "resume_analyzed_sub" {
  name    = "cliff-resume-analyzed-sub-${var.environment}"
  topic   = google_pubsub_topic.resume_analyzed.id
  project = var.project_id

  ack_deadline_seconds = 120

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.backend.uri}/api/internal/events/resume-analyzed"

    oidc_token {
      service_account_email = google_service_account.cliff_sa.email
      audience              = google_cloud_run_v2_service.backend.uri
    }
  }

  retry_policy {
    minimum_backoff = "5s"
    maximum_backoff = "60s"
  }

  depends_on = [google_project_service.apis]
}

# 7. Authorize Cloud Run Service Account to invoke Cloud Run via Pub/Sub push OIDC
resource "google_cloud_run_v2_service_iam_member" "sa_invoker" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cliff_sa.email}"
}

