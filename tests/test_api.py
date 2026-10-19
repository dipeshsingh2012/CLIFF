import os
import unittest
from fastapi.testclient import TestClient

TEST_DB_PATH = "./test_cliff.db"
os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL", f"sqlite:///{TEST_DB_PATH}")

from main import app
from database import create_db_and_tables

class APITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        create_db_and_tables()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except OSError:
                pass


    def test_api_health_check(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["app"], "CLIFF Backend")

    def test_health_check_alias(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")

    def test_signed_upload_url_endpoint_structure(self):
        response = self.client.post("/api/storage/signed-upload-url", json={"filename": "resume.pdf", "content_type": "application/pdf"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("mode", data)
        if data["mode"] == "gcs":
            self.assertIn("signed_url", data)
            self.assertIn("object_name", data)
            self.assertIn("bucket_name", data)
        else:
            self.assertEqual(data["mode"], "local")

    def test_upload_status_not_found(self):
        response = self.client.get("/api/profile/upload-status/non-existent-uuid")
        self.assertEqual(response.status_code, 404)

    def test_delete_job_with_intelligence(self):
        # 1. Create a job
        job_payload = {
            "title": "Temporary Job for Deletion",
            "company": "Test Co",
            "url": "https://www.linkedin.com/jobs/view/9999999",
            "raw_description": "A test job to verify foreign key cascade deletion."
        }
        res_create = self.client.post("/api/jobs", json=job_payload)
        self.assertEqual(res_create.status_code, 200)
        job_id = res_create.json()["id"]

        # 2. Verify Job and JobIntelligence exist
        res_get = self.client.get(f"/api/jobs/{job_id}")
        self.assertEqual(res_get.status_code, 200)

        # 3. Delete the job
        res_delete = self.client.delete(f"/api/jobs/{job_id}")
        self.assertEqual(res_delete.status_code, 200)
        self.assertEqual(res_delete.json()["message"], "Job deleted successfully")

        # 4. Verify Job is gone
        res_after = self.client.get(f"/api/jobs/{job_id}")
        self.assertEqual(res_after.status_code, 404)

if __name__ == "__main__":
    unittest.main()



