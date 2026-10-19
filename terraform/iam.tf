# Dedicated Cloud Run Runtime Service Account
resource "google_service_account" "cliff_sa" {
  account_id   = "cliff-app-sa-${var.environment}"
  display_name = "CLIFF Serverless Application Service Account"
  project      = var.project_id
  description  = "Identity for Cloud Run and Cloud Run functions to access Cloud SQL, GCS, Vertex AI, and Secret Manager"
}

# 1. GCS Bucket Access: Read/Write to resume and tailored buckets
resource "google_storage_bucket_iam_member" "resumes_admin" {
  bucket = google_storage_bucket.resumes.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cliff_sa.email}"
}

resource "google_storage_bucket_iam_member" "tailored_admin" {
  bucket = google_storage_bucket.tailored_resumes.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cliff_sa.email}"
}

# 2. Cloud SQL Connectivity
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cliff_sa.email}"
}

# 3. Vertex AI (Gemini 2.5 Flash / Embeddings) without API keys
resource "google_project_iam_member" "vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cliff_sa.email}"
}

# 4. Service Account Token Creator: Allows Cloud Run to generate v4 signed URLs
resource "google_service_account_iam_member" "token_creator_self" {
  service_account_id = google_service_account.cliff_sa.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.cliff_sa.email}"
}

# 5. Cloud Build Service Account: Allows Cloud Build to push to Artifact Registry
resource "google_project_iam_member" "cloudbuild_artifactregistry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
  depends_on = [google_project_service.apis]
}

# 6. GitHub Actions CI/CD Deployer Service Account
resource "google_project_iam_member" "gh_actions_deployer_editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:gh-actions-deployer@mycommerce-508208.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "gh_actions_deployer_iam" {
  project = var.project_id
  role    = "roles/resourcemanager.projectIamAdmin"
  member  = "serviceAccount:gh-actions-deployer@mycommerce-508208.iam.gserviceaccount.com"
}



