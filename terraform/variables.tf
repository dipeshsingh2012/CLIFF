variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
  default     = "cliff-512020"
}


variable "region" {
  description = "GCP Region for Cloud Run, Cloud SQL, and GCS"
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


variable "db_tier" {
  description = "Machine tier for Cloud SQL PostgreSQL instance"
  type        = string
  default     = "db-custom-1-3840" # 1 vCPU, 3.75 GB RAM (production ready with pgvector)
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "cliff"
}

variable "db_user" {
  description = "Username for Cloud SQL PostgreSQL"
  type        = string
  default     = "cliff_app"
}

variable "backend_image" {
  description = "Container image URI for Cloud Run backend (defaults to Google's official hello bootstrap container)"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

