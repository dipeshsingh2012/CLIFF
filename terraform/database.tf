# Cloud SQL PostgreSQL 16 Instance with pgvector extension support
resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "google_sql_database_instance" "postgres" {
  name                = "cliff-db-${var.environment}-${random_id.bucket_suffix.hex}"
  database_version    = "POSTGRES_16"
  region              = var.region
  project             = var.project_id
  deletion_protection = false # Set to true for strict production retention


  settings {
    tier              = var.db_tier
    availability_type = "ZONAL" # Change to REGIONAL for multi-zone HA in high-availability prod
    disk_size         = 20
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    # Note: pgvector is natively supported in Cloud SQL PostgreSQL 15+ without database flags.
    # Enable it inside PostgreSQL via `CREATE EXTENSION IF NOT EXISTS vector;`

    # Connection pooling and query optimization
    database_flags {
      name  = "max_connections"
      value = "100"
    }

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
    }
  }

  depends_on = [google_project_service.apis]
}

# The CLIFF PostgreSQL Database
resource "google_sql_database" "cliff" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
}

# The CLIFF Application DB User
resource "google_sql_user" "app_user" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
  project  = var.project_id
}

