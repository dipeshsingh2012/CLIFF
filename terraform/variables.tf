variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
  default     = "cliff-512020"
}


variable "region" {
  description = "GCP Region for Cloud Run and GCS"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "cors_origins" {
  description = "Allowed origins for GCS CORS and Cloud Run CORS"
  type        = list(string)
  default     = [
    "https://cliff-one-beryl.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*"
  ]
}

variable "database_url" {
  description = "Neon Serverless PostgreSQL connection string (DATABASE_URL)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "backend_image" {
  description = "Container image URI for Cloud Run backend (defaults to Google's official hello bootstrap container)"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

