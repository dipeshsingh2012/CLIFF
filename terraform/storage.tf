# GCS Bucket for Resume Ingestion (Direct Browser v4 Signed Uploads)
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "google_storage_bucket" "resumes" {
  name                        = "cliff-resumes-${var.environment}-${random_id.bucket_suffix.hex}"
  location                    = var.region
  project                     = var.project_id
  force_destroy               = false
  uniform_bucket_level_access = true

  # CORS Configuration: Crucial for direct browser PUT uploads via signed URLs
  cors {
    origin          = var.cors_origins
    method          = ["GET", "PUT", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "x-goog-resumable", "Access-Control-Allow-Origin"]
    max_age_seconds = 3600
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      days_since_noncurrent_time = 30
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}

# GCS Bucket for Generated Tailored Resumes & Cover Letter PDFs
resource "google_storage_bucket" "tailored_resumes" {
  name                        = "cliff-tailored-${var.environment}-${random_id.bucket_suffix.hex}"
  location                    = var.region
  project                     = var.project_id
  force_destroy               = false
  uniform_bucket_level_access = true

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "Access-Control-Allow-Origin"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.apis]
}

