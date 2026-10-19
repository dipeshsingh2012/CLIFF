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
        job_id = res_create.json()["job"]["id"]

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

    def test_learning_roadmap_by_job_id(self):
        # 1. Create a job
        job_payload = {
            "title": "Cloud Architect",
            "company": "NextGen Cloud",
            "url": "https://www.linkedin.com/jobs/view/8888888",
            "raw_description": "Looking for Cloud Architect with Kubernetes, Terraform, and Go experience."
        }
        res_create = self.client.post("/api/jobs", json=job_payload)
        self.assertEqual(res_create.status_code, 200)
        job_id = res_create.json()["job"]["id"]

        # 2. Call learning-roadmap with only job_id
        res_roadmap = self.client.post("/api/ai/learning-roadmap", json={"job_id": job_id})
        self.assertEqual(res_roadmap.status_code, 200)
        roadmap = res_roadmap.json()
        self.assertIn("overview", roadmap)
        self.assertIn("key_topics", roadmap)
        self.assertTrue(len(roadmap["key_topics"]) > 0)

    def test_lms_track_quiz_and_graduation(self):
        # 1. Create a job with clear skill gaps
        job_payload = {
            "title": "Senior Distributed Systems Engineer",
            "company": "Fintech Global",
            "url": "https://www.linkedin.com/jobs/view/7777777",
            "raw_description": "We are seeking a Senior Distributed Systems Engineer skilled in Apache Kafka, Rust, and High-Throughput Event Streaming.",
            "company_industry": "Financial Services",
            "company_size": "5,001-10,000 employees",
            "seniority_level": "Senior"
        }
        res_create = self.client.post("/api/jobs", json=job_payload)
        self.assertEqual(res_create.status_code, 200)
        job_id = res_create.json()["job"]["id"]

        # 2. Generate LMS track for this job
        res_track = self.client.post(f"/api/lms/jobs/{job_id}/generate-track")
        self.assertEqual(res_track.status_code, 200)
        track_data = res_track.json()
        self.assertIn("modules", track_data)
        self.assertTrue(len(track_data["modules"]) > 0)
        module = track_data["modules"][0]
        module_id = module["id"]
        self.assertIn("reading_markdown", module)
        self.assertIn("quiz_questions", module)
        self.assertEqual(len(module["quiz_questions"]), 3)
        self.assertEqual(module["status"], "NOT_STARTED")

        # 3. Retrieve single module detail
        res_mod = self.client.get(f"/api/lms/modules/{module_id}")
        self.assertEqual(res_mod.status_code, 200)
        self.assertEqual(res_mod.json()["id"], module_id)

        # 4. Submit failing quiz answers (all wrong)
        wrong_answers = [-1, -1, -1]
        res_fail = self.client.post(f"/api/lms/modules/{module_id}/submit-quiz", json={"answers": wrong_answers})
        self.assertEqual(res_fail.status_code, 200)
        fail_data = res_fail.json()
        self.assertEqual(fail_data["score"], 0)
        self.assertFalse(fail_data["passed"])
        self.assertEqual(fail_data["status"], "IN_PROGRESS")

        # 5. Submit 100% correct answers
        correct_answers = [q["correct_index"] for q in module["quiz_questions"]]
        res_pass = self.client.post(f"/api/lms/modules/{module_id}/submit-quiz", json={"answers": correct_answers})
        self.assertEqual(res_pass.status_code, 200)
        pass_data = res_pass.json()
        self.assertEqual(pass_data["score"], 100)
        self.assertTrue(pass_data["passed"])
        self.assertEqual(pass_data["status"], "MASTERED")

        # 6. Graduate the skill into the user profile
        res_grad = self.client.post(f"/api/lms/modules/{module_id}/graduate")
        self.assertEqual(res_grad.status_code, 200)
        grad_data = res_grad.json()
        self.assertIn("graduated_skill", grad_data)
        self.assertIn(module["skill_gap"], grad_data["all_skills"])

        # 7. Check LMS modules list reflects mastered count
        res_list = self.client.get(f"/api/lms/jobs/{job_id}/modules")
        self.assertEqual(res_list.status_code, 200)
        self.assertGreaterEqual(res_list.json()["mastered_modules"], 1)

        # 8. Clean up / cascade delete job with learning modules
        res_del = self.client.delete(f"/api/jobs/{job_id}")
        self.assertEqual(res_del.status_code, 200)

if __name__ == "__main__":
    unittest.main()



