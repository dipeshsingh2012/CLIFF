terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "gcs" {
    bucket = "cliff-tfstate-cliff-512020"
    prefix = "terraform/state"
  }
}


provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

data "google_project" "project" {
  project_id = var.project_id
}

# Enable required Google Cloud APIs automatically
locals {
  services = [
    "run.googleapis.com",              # Cloud Run
    "sqladmin.googleapis.com",         # Cloud SQL
    "storage.googleapis.com",          # Cloud Storage
    "secretmanager.googleapis.com",    # Secret Manager
    "aiplatform.googleapis.com",       # Vertex AI
    "iamcredentials.googleapis.com",   # For v4 Signed URLs via IAM
    "artifactregistry.googleapis.com", # Artifact Registry for Docker images
    "cloudtasks.googleapis.com",       # Cloud Tasks for async queuing
    "pubsub.googleapis.com",           # Pub/Sub for event-driven resume ingestion
    "eventarc.googleapis.com",         # Eventarc for storage event triggers
    "cloudbuild.googleapis.com"        # Cloud Build for container image builds
  ]
}

resource "google_project_service" "apis" {
  for_each                   = toset(local.services)
  project                    = var.project_id
  service                    = each.key
  disable_dependent_services = false
  disable_on_destroy         = false
}

