# Google Artifact Registry Repository for CLIFF Docker Images
resource "google_artifact_registry_repository" "cliff_repo" {
  location      = var.region
  repository_id = "cliff-repo"
  description   = "Docker container repository for CLIFF services"
  format        = "DOCKER"
  project       = var.project_id

  depends_on = [google_project_service.apis]
}

