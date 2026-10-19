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

if __name__ == "__main__":
    unittest.main()



