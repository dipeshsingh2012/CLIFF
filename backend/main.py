"""CLIFF Backend Service.

FastAPI application providing career intelligence, LinkedIn & ATS job tracking,
asynchronous resume ingestion (Cloud Storage & Vertex AI), and mini-LMS skill bridging.
"""

import io
import os
import re
import json
import uuid
import time
import base64
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

import pypdf
import docx
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from pydantic import BaseModel

from models import UserProfile, Job, JobIntelligence, ResumeUploadTask, JobLearningModule
from database import engine, create_db_and_tables, get_session
from ai_engine import (
    parse_job_intelligence,
    tailor_resume,
    generate_cover_letter,
    draft_ats_answer,
    generate_learning_roadmap,
    generate_job_learning_module,
    parse_resume_to_structured_profile
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("cliff.backend")
logger.setLevel(logging.INFO)

GCS_RESUMES_BUCKET = os.getenv("GCS_RESUMES_BUCKET", "cliff-resumes-prod-b3e45c44")
SERVICE_ACCOUNT_EMAIL = os.getenv("SERVICE_ACCOUNT_EMAIL", "cliff-app-sa-prod@cliff-512020.iam.gserviceaccount.com")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling database schema initialization and initial seed data."""
    create_db_and_tables()
    try:
        with Session(engine) as session:
            existing_jobs = session.exec(select(Job)).first()
            if not existing_jobs:
                seed_sample_jobs(session)
    except Exception as e:
        logger.warning(f"[Lifespan] Sample job seeding skipped: {e}")
    yield


app = FastAPI(
    title="CLIFF API - Career Intelligence & Job Framework",
    version="1.0.0",
    description="Local-first Career Intelligence and Job Tracking Engine",
    lifespan=lifespan
)

# CORS configuration allowing Chrome extensions, LinkedIn, and React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cliff-one-beryl.vercel.app",
        "https://www.linkedin.com",
        "https://linkedin.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_sample_jobs(session: Session):
    """Seeds realistic engineering roles if the jobs table is empty on startup."""
    profile = session.exec(select(UserProfile)).first()
    candidate_skills = profile.skills if profile else ["Python", "FastAPI", "React", "Docker", "PostgreSQL"]

    sample_jobs = [
        {
            "title": "Senior AI Systems Engineer",
            "company": "Anthropic / Scale AI",
            "location": "San Francisco, CA (Hybrid)",
            "url": "https://www.linkedin.com/jobs/view/10001",
            "raw_description": """We are seeking a Senior AI Systems Engineer to build production-grade LLM inference infrastructure and RAG platforms.
Responsibilities:
- Build high-performance backend microservices with FastAPI and Python.
- Deploy scalable distributed pipelines on AWS using Kubernetes and Docker.
- Implement vector search architectures with Redis, PostgreSQL, and Pinecone.
- Collaborate with frontend engineers using React and TypeScript.
Requirements:
- 5+ years of experience with Python, FastAPI, Docker, and Kubernetes.
- Experience with LLM integrations (Gemini, OpenAI, LangChain) and vector embeddings.
- Strong knowledge of System Design, CI/CD, and PostgreSQL optimization.
Salary: $180,000 - $210,000 / year + equity.""",
            "status": "Applied",
            "source": "LinkedIn"
        },
        {
            "title": "Lead Full-Stack Platform Architect",
            "company": "Vercel / NextGen Tech",
            "location": "Remote (US)",
            "url": "https://www.linkedin.com/jobs/view/10002",
            "raw_description": """Join our platform team to architect next-generation developer workflows.
Responsibilities:
- Architect full-stack web applications using React, Next.js, and TypeScript.
- Design resilient REST and GraphQL APIs with Python or Node.js.
- Optimize web performance and browser automation workflows.
Requirements:
- Strong expertise in TypeScript, React, Tailwind CSS, GraphQL, and microservices.
- Familiarity with CI/CD, Docker, and cloud deployments (AWS/GCP).
- Proven track record of technical leadership and cross-functional mentorship.""",
            "status": "Interviewing",
            "source": "LinkedIn"
        },
        {
            "title": "Distributed Backend Engineer",
            "company": "Stripe",
            "location": "San Francisco, CA",
            "url": "https://www.linkedin.com/jobs/view/10003",
            "raw_description": """Stripe is looking for a Backend Engineer to scale our global financial settlement engine.
Responsibilities:
- Architect high-throughput distributed systems in Python, Go, and SQL.
- Optimize database transactions and queueing with Kafka and Redis.
Requirements:
- Experience building financial or payment systems at scale.
- Deep expertise in PostgreSQL, Kafka, Redis, Docker, and distributed consensus.""",
            "status": "Saved",
            "source": "LinkedIn"
        }
    ]

    for item in sample_jobs:
        intel = parse_job_intelligence(
            raw_description=item["raw_description"],
            title=item["title"],
            company=item["company"],
            candidate_skills=candidate_skills
        )
        job = Job(
            title=item["title"],
            company=item["company"],
            location=item["location"],
            url=item["url"],
            raw_description=item["raw_description"],
            status=item["status"],
            match_score=intel["match_score"],
            salary_range=intel.get("salary_range", ""),
            source=item["source"],
            workplace_type=item.get("workplace_type", "Remote"),
            employment_type="Full-time",
            seniority_level="Mid-Senior level",
            is_easy_apply=item.get("is_easy_apply", True),
            applicant_count=item.get("applicant_count", "45 applicants"),
            posted_date=item.get("posted_date", "Posted 2d ago"),
            hiring_manager=item.get("hiring_manager", {})
        )
        session.add(job)
        session.commit()
        session.refresh(job)

        job_intel = JobIntelligence(
            job_id=job.id,
            extracted_hard_skills=intel.get("extracted_hard_skills", []),
            extracted_soft_skills=intel.get("extracted_soft_skills", []),
            experience_level_required=intel.get("experience_level_required", "Mid-Senior"),
            missing_skills=intel.get("missing_skills", []),
            matched_skills=intel.get("matched_skills", []),
            summary=intel.get("summary", ""),
            role_responsibilities=intel.get("role_responsibilities", [])
        )
        session.add(job_intel)
        session.commit()
    logger.info("[Lifespan] Sample jobs seeded successfully.")


# --- Request / Response Schemas ---

class JobCreatePayload(BaseModel):
    title: str
    company: str
    location: Optional[str] = "Remote"
    url: str
    raw_description: str
    status: Optional[str] = "Saved"
    salary_range: Optional[str] = ""
    source: Optional[str] = "LinkedIn"
    notes: Optional[str] = ""
    workplace_type: Optional[str] = ""
    employment_type: Optional[str] = ""
    seniority_level: Optional[str] = ""
    is_easy_apply: Optional[bool] = False
    applicant_count: Optional[str] = ""
    posted_date: Optional[str] = ""
    company_logo: Optional[str] = ""
    company_url: Optional[str] = ""
    company_size: Optional[str] = ""
    company_industry: Optional[str] = ""
    hiring_manager: Optional[Dict[str, Any]] = None


class StatusUpdatePayload(BaseModel):
    status: str
    notes: Optional[str] = None
    applied_date: Optional[str] = None


class ProfileUpdatePayload(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    master_resume_text: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_blocks: Optional[List[Dict[str, Any]]] = None
    standard_answers: Optional[Dict[str, str]] = None


class ParseJobPayload(BaseModel):
    raw_description: str
    title: Optional[str] = ""
    company: Optional[str] = ""


class TailorResumePayload(BaseModel):
    job_id: Optional[int] = None
    job_title: Optional[str] = ""
    company: Optional[str] = ""
    job_description: Optional[str] = ""


class CoverLetterPayload(BaseModel):
    job_id: Optional[int] = None
    job_title: Optional[str] = ""
    company: Optional[str] = ""
    job_description: Optional[str] = ""
    tone: Optional[str] = "Confident & Professional"
    hiring_manager: Optional[Dict[str, Any]] = None


class DraftAnswerPayload(BaseModel):
    question: str
    job_context: Optional[str] = ""


class LearningRoadmapPayload(BaseModel):
    job_id: Optional[int] = None
    missing_skills: Optional[List[str]] = None
    job_title: Optional[str] = "Software Engineer"


class QuizSubmissionPayload(BaseModel):
    answers: List[int]


class SignedUploadUrlRequest(BaseModel):
    filename: str
    content_type: Optional[str] = "application/pdf"


class ProcessUploadedResumePayload(BaseModel):
    object_name: str
    bucket_name: Optional[str] = None
    task_id: Optional[str] = None


class PubSubMessage(BaseModel):
    data: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    messageId: Optional[str] = None


class PubSubPushPayload(BaseModel):
    message: PubSubMessage
    subscription: Optional[str] = None


# --- Shared Helpers ---

def format_job(job: Job) -> dict:
    """Serializes a Job entity into a structured API response dictionary."""
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "url": job.url,
        "raw_description": job.raw_description,
        "status": job.status,
        "match_score": job.match_score,
        "salary_range": job.salary_range or "",
        "source": job.source or "LinkedIn",
        "notes": job.notes or "",
        "applied_date": job.applied_date,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "workplace_type": job.workplace_type or "",
        "employment_type": job.employment_type or "",
        "seniority_level": job.seniority_level or "",
        "is_easy_apply": bool(job.is_easy_apply),
        "applicant_count": job.applicant_count or "",
        "posted_date": job.posted_date or "",
        "company_logo": job.company_logo or "",
        "company_url": job.company_url or "",
        "company_size": job.company_size or "",
        "company_industry": job.company_industry or "",
        "hiring_manager": job.hiring_manager or {}
    }


def extract_text_from_file(filename: str, content: bytes) -> str:
    """Extracts plain text from PDF, DOCX, or text files."""
    filename_lower = filename.lower()
    text = ""
    if filename_lower.endswith(".pdf"):
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages_text = [p.extract_text() for p in reader.pages if p.extract_text()]
        text = "\n".join(pages_text)
    elif filename_lower.endswith(".docx") or filename_lower.endswith(".doc"):
        doc = docx.Document(io.BytesIO(content))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                if row_text:
                    paragraphs.append(row_text)
        text = "\n".join(paragraphs)
    else:
        text = content.decode("utf-8", errors="replace")
    return text.strip()


def _commit_parsed_profile_and_rescore(session: Session, parsed_profile: Dict[str, Any], raw_text: str) -> int:
    """Single-source-of-truth helper: Updates UserProfile and re-scores all saved jobs."""
    profile = session.exec(select(UserProfile)).first()
    if not profile:
        profile = UserProfile(
            full_name=parsed_profile.get("full_name") or "Candidate",
            email=parsed_profile.get("email") or "",
            phone=parsed_profile.get("phone") or ""
        )
        session.add(profile)

    if parsed_profile.get("full_name") and parsed_profile["full_name"] != "Candidate":
        profile.full_name = parsed_profile["full_name"]
    if parsed_profile.get("email"):
        profile.email = parsed_profile["email"]
    if parsed_profile.get("phone"):
        profile.phone = parsed_profile["phone"]
    if parsed_profile.get("location"):
        profile.location = parsed_profile["location"]
    if parsed_profile.get("linkedin_url"):
        profile.linkedin_url = parsed_profile["linkedin_url"]
    if parsed_profile.get("github_url"):
        profile.github_url = parsed_profile["github_url"]
    if parsed_profile.get("portfolio_url"):
        profile.portfolio_url = parsed_profile["portfolio_url"]

    profile.master_resume_text = raw_text

    # Merge skills
    existing_skills = profile.skills or []
    new_skills = parsed_profile.get("skills", [])
    profile.skills = sorted(list(set(existing_skills + new_skills)))

    if parsed_profile.get("experience_blocks"):
        profile.experience_blocks = parsed_profile["experience_blocks"]

    # Merge standard answers
    current_std = profile.standard_answers or {}
    new_std = parsed_profile.get("standard_answers", {})
    for k, v in new_std.items():
        if not current_std.get(k) and v:
            current_std[k] = v
    profile.standard_answers = current_std

    session.add(profile)
    session.commit()
    session.refresh(profile)

    # Re-calculate match scores across saved jobs
    jobs = session.exec(select(Job)).all()
    rescored_count = 0
    for job in jobs:
        intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
        if intel:
            parsed = parse_job_intelligence(
                raw_description=job.raw_description,
                title=job.title,
                company=job.company,
                candidate_skills=profile.skills
            )
            job.match_score = parsed["match_score"]
            intel.matched_skills = parsed["matched_skills"]
            intel.missing_skills = parsed["missing_skills"]
            session.add(job)
            session.add(intel)
            rescored_count += 1
    session.commit()
    return rescored_count


def _rescore_jobs_background(candidate_skills: List[str]):
    """Background task recalculating job match scores without blocking HTTP response."""
    try:
        with Session(engine) as bg_session:
            jobs = bg_session.exec(select(Job)).all()
            for job in jobs:
                intel = bg_session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
                if intel:
                    parsed = parse_job_intelligence(
                        raw_description=job.raw_description,
                        title=job.title,
                        company=job.company,
                        candidate_skills=candidate_skills
                    )
                    job.match_score = parsed["match_score"]
                    intel.matched_skills = parsed["matched_skills"]
                    intel.missing_skills = parsed["missing_skills"]
                    bg_session.add(job)
                    bg_session.add(intel)
            bg_session.commit()
            logger.info(f"[Profile] Background job re-scoring completed for {len(jobs)} jobs.")
    except Exception as e:
        logger.warning(f"[Profile] Background job re-scoring failed: {e}")


# --- 1. System & Profile Endpoints ---

@app.get("/health")
@app.get("/api/health")
def health_check():
    """Liveness probe reporting backend availability."""
    return {"status": "ok", "app": "CLIFF Backend", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/profile")
def get_user_profile(session: Session = Depends(get_session)):
    """Retrieves the candidate's master profile and skills matrix."""
    profile = session.exec(select(UserProfile)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not initialized")
    return profile


@app.put("/api/profile")
def update_user_profile(
    payload: ProfileUpdatePayload,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """Updates candidate profile fields and schedules asynchronous pipeline re-scoring."""
    profile = session.exec(select(UserProfile)).first()
    if not profile:
        profile = UserProfile(full_name="Alex Rivera", email="alex@example.com", phone="")
        session.add(profile)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    session.add(profile)
    session.commit()
    session.refresh(profile)

    if profile.skills:
        background_tasks.add_task(_rescore_jobs_background, profile.skills)

    return profile


@app.post("/api/profile/upload-resume")
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """Multipart upload endpoint: parses resume text, updates profile, and re-scores jobs."""
    logger.info(f"[Resume Ingest] Ingesting file: '{file.filename}' ({file.content_type})")
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        raw_text = extract_text_from_file(file.filename, content)
    except Exception as e:
        logger.error(f"[Resume Ingest] Error extracting text from {file.filename}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    if len(raw_text) < 20:
        raise HTTPException(status_code=400, detail="Could not extract readable text from document.")

    parsed_profile = parse_resume_to_structured_profile(raw_text)
    rescored_count = _commit_parsed_profile_and_rescore(session, parsed_profile, raw_text)

    profile = session.exec(select(UserProfile)).first()
    logger.info(f"[Resume Ingest] Upload parsed. Profile updated, {rescored_count} jobs rescored.")

    return {
        "status": "success",
        "message": f"Resume parsed successfully! Extracted {len(profile.skills)} skills and {len(profile.experience_blocks or [])} experience blocks.",
        "profile": profile,
        "rescored_jobs_count": rescored_count,
        "raw_text_length": len(raw_text)
    }


@app.post("/api/storage/signed-upload-url")
def get_signed_upload_url(
    payload: SignedUploadUrlRequest,
    session: Session = Depends(get_session)
):
    """Generates a Google Cloud Storage v4 signed PUT URL for direct browser uploads."""
    bucket_name = GCS_RESUMES_BUCKET
    task_id = str(uuid.uuid4())

    if not bucket_name:
        return {
            "mode": "local",
            "task_id": task_id,
            "message": "GCS bucket not configured; using direct local API multipart upload."
        }

    try:
        from google.cloud import storage
        import google.auth
        import google.auth.transport.requests

        credentials, project = google.auth.default()
        gcp_project = os.getenv("GCP_PROJECT_ID", project or "cliff-512020")
        client = storage.Client(credentials=credentials, project=gcp_project)
        bucket = client.bucket(bucket_name)

        ext = payload.filename.split(".")[-1].lower() if "." in payload.filename else "pdf"
        safe_filename = re.sub(r'[^a-zA-Z0-9_\.-]', '_', payload.filename)
        object_name = f"resumes/{task_id}_{safe_filename}"
        blob = bucket.blob(object_name)

        # Resolve MIME type
        content_type = payload.content_type
        if not content_type or content_type == "application/octet-stream":
            if ext == "pdf":
                content_type = "application/pdf"
            elif ext == "docx":
                content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif ext == "doc":
                content_type = "application/msword"
            elif ext in ["txt", "md"]:
                content_type = "text/plain"
            else:
                content_type = "application/pdf"

        sign_kwargs = {
            "version": "v4",
            "expiration": timedelta(minutes=15),
            "method": "PUT",
        }

        sa_email = SERVICE_ACCOUNT_EMAIL or getattr(credentials, "service_account_email", None)
        if not (hasattr(credentials, "signer") and credentials.signer):
            if not credentials.valid:
                auth_req = google.auth.transport.requests.Request()
                credentials.refresh(auth_req)
            if sa_email:
                sign_kwargs["service_account_email"] = sa_email
                sign_kwargs["access_token"] = credentials.token

        signed_url = blob.generate_signed_url(**sign_kwargs)

        # Record tracking task
        try:
            task = ResumeUploadTask(
                task_id=task_id,
                filename=payload.filename,
                object_name=object_name,
                bucket_name=bucket_name,
                status="PENDING",
                stage_message="Signed upload URL ready. Awaiting browser upload..."
            )
            session.add(task)
            session.commit()
        except Exception as te:
            logger.warning(f"[Storage] Could not persist tracking task {task_id}: {te}")

        logger.info(f"[Storage] Signed URL generated: task_id={task_id}, object={object_name}")
        return {
            "mode": "gcs",
            "task_id": task_id,
            "signed_url": signed_url,
            "object_name": object_name,
            "bucket_name": bucket_name,
            "content_type": content_type,
            "expires_in_seconds": 900
        }
    except Exception as e:
        logger.warning(f"[Storage] GCS signed URL generation failed ({e}), falling back to local mode.")
        return {
            "mode": "local",
            "task_id": task_id,
            "error": str(e),
            "message": "Falling back to local multipart upload."
        }


@app.get("/api/profile/upload-status/{task_id}")
def get_resume_upload_status(task_id: str, session: Session = Depends(get_session)):
    """Status polling endpoint for frontend to check asynchronous resume parsing progress."""
    task = session.exec(select(ResumeUploadTask).where(ResumeUploadTask.task_id == task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

    res = {
        "task_id": task.task_id,
        "filename": task.filename,
        "status": task.status,
        "stage_message": task.stage_message,
        "error_message": task.error_message,
        "result_summary": task.result_summary,
        "rescored_jobs_count": task.rescored_jobs_count,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None
    }
    if task.status == "COMPLETED":
        profile = session.exec(select(UserProfile)).first()
        res["profile"] = profile

    return res


@app.post("/api/internal/events/resume-uploaded")
async def handle_resume_uploaded_event(
    payload: PubSubPushPayload,
    session: Session = Depends(get_session)
):
    """Event-driven Pub/Sub push webhook triggered when a resume lands in Google Cloud Storage."""
    task = None
    try:
        if not payload.message or not payload.message.data:
            return {"status": "ignored", "reason": "Empty message data"}

        raw_json_str = base64.b64decode(payload.message.data).decode("utf-8")
        data = json.loads(raw_json_str)
        bucket_name = data.get("bucket") or GCS_RESUMES_BUCKET
        object_name = data.get("name")
        logger.info(f"[Pub/Sub Event] Ingesting GCS event: {bucket_name}/{object_name}")

        if not object_name or not object_name.startswith("resumes/"):
            return {"status": "ignored", "reason": "Not a resume object"}

        filename_part = object_name.split("/")[-1]
        task_id = filename_part.split("_")[0] if "_" in filename_part else None

        if task_id:
            task = session.exec(select(ResumeUploadTask).where(ResumeUploadTask.task_id == task_id)).first()

        if task:
            task.status = "PROCESSING"
            task.stage_message = "Document landed in GCS. Running text extraction & AI analysis..."
            task.updated_at = datetime.now(timezone.utc)
            session.add(task)
            session.commit()

        # Download from GCS
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(object_name)

        if not blob.exists():
            if task:
                task.status = "FAILED"
                task.error_message = f"Object '{object_name}' not found in GCS"
                task.updated_at = datetime.now(timezone.utc)
                session.add(task)
                session.commit()
            return {"status": "error", "reason": "Blob not found"}

        content = blob.download_as_bytes()
        raw_text = extract_text_from_file(filename_part, content)

        if len(raw_text) < 20:
            if task:
                task.status = "FAILED"
                task.error_message = "Could not extract readable text from document."
                task.updated_at = datetime.now(timezone.utc)
                session.add(task)
                session.commit()
            return {"status": "error", "reason": "No readable text"}

        parsed_profile = parse_resume_to_structured_profile(raw_text)
        rescored_count = _commit_parsed_profile_and_rescore(session, parsed_profile, raw_text)

        if task:
            task.status = "COMPLETED"
            task.stage_message = f"Decomposition complete! Extracted {len(parsed_profile.get('skills', []))} skills. Re-scored {rescored_count} jobs."
            task.result_summary = f"Extracted {len(parsed_profile.get('skills', []))} skills and {len(parsed_profile.get('experience_blocks', []))} experience blocks."
            task.rescored_jobs_count = rescored_count
            task.updated_at = datetime.now(timezone.utc)
            session.add(task)
            session.commit()

        logger.info(f"[Pub/Sub Event] Processed {object_name} successfully. {rescored_count} jobs rescored.")
        return {"status": "success", "task_id": task_id, "rescored_jobs_count": rescored_count}

    except Exception as e:
        logger.error(f"[Pub/Sub Event] Processing error: {e}", exc_info=True)
        if task:
            task.status = "FAILED"
            task.error_message = str(e)
            task.updated_at = datetime.now(timezone.utc)
            session.add(task)
            session.commit()
        return {"status": "error", "detail": str(e)}


@app.post("/api/profile/process-uploaded-resume")
async def process_uploaded_resume(
    payload: ProcessUploadedResumePayload,
    session: Session = Depends(get_session)
):
    """Direct synchronous processor for GCS uploads (fallback if Pub/Sub push notification is delayed)."""
    bucket_name = payload.bucket_name or GCS_RESUMES_BUCKET
    if not bucket_name:
        raise HTTPException(status_code=400, detail="GCS bucket name not provided or configured.")

    task = None
    if payload.task_id:
        task = session.exec(select(ResumeUploadTask).where(ResumeUploadTask.task_id == payload.task_id)).first()

    logger.info(f"[Storage Process] Downloading '{payload.object_name}' from bucket '{bucket_name}'...")
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(payload.object_name)

        if not blob.exists():
            raise HTTPException(status_code=404, detail=f"Object '{payload.object_name}' not found in bucket '{bucket_name}'.")

        content = blob.download_as_bytes()
        filename = payload.object_name.split("/")[-1]
    except Exception as e:
        logger.error(f"[Storage Process] GCS download error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve file from GCS: {str(e)}")

    try:
        raw_text = extract_text_from_file(filename, content)
    except Exception as e:
        logger.error(f"[Storage Process] Text extraction error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    if len(raw_text) < 20:
        raise HTTPException(status_code=400, detail="Could not extract readable text from document.")

    parsed_profile = parse_resume_to_structured_profile(raw_text)
    rescored_count = _commit_parsed_profile_and_rescore(session, parsed_profile, raw_text)

    profile = session.exec(select(UserProfile)).first()

    if task:
        task.status = "COMPLETED"
        task.stage_message = f"Decomposition complete! Extracted {len(profile.skills)} skills."
        task.result_summary = f"Extracted {len(profile.skills)} skills and {len(profile.experience_blocks or [])} experience blocks."
        task.rescored_jobs_count = rescored_count
        task.updated_at = datetime.now(timezone.utc)
        session.add(task)
        session.commit()

    return {
        "status": "success",
        "message": f"Resume parsed from Cloud Storage! Extracted {len(profile.skills)} skills and {len(profile.experience_blocks or [])} experience blocks.",
        "profile": profile,
        "rescored_jobs_count": rescored_count,
        "object_name": payload.object_name,
        "task_id": payload.task_id,
        "raw_text_length": len(raw_text)
    }


# --- 2. Job Pipeline Endpoints ---

@app.post("/api/jobs")
def create_or_ingest_job(payload: JobCreatePayload, session: Session = Depends(get_session)):
    """Ingests or updates a job application, extracting skills and calculating match scores."""
    start_time = time.perf_counter()
    logger.info(f"[Jobs Ingest] Ingesting '{payload.title}' @ '{payload.company}' (url={payload.url})")

    profile = session.exec(select(UserProfile)).first()
    candidate_skills = profile.skills if profile else []

    existing_job = session.exec(select(Job).where(Job.url == payload.url)).first()

    intel_data = parse_job_intelligence(
        raw_description=payload.raw_description,
        title=payload.title,
        company=payload.company,
        candidate_skills=candidate_skills
    )

    if existing_job:
        existing_job.title = payload.title
        existing_job.company = payload.company
        existing_job.location = payload.location or existing_job.location
        existing_job.raw_description = payload.raw_description
        existing_job.match_score = intel_data["match_score"]
        if payload.salary_range:
            existing_job.salary_range = payload.salary_range
        elif intel_data.get("salary_range"):
            existing_job.salary_range = intel_data["salary_range"]
        
        if payload.workplace_type:
            existing_job.workplace_type = payload.workplace_type
        elif not existing_job.workplace_type and intel_data.get("workplace_type"):
            existing_job.workplace_type = intel_data["workplace_type"]

        if payload.employment_type: existing_job.employment_type = payload.employment_type
        if payload.seniority_level: existing_job.seniority_level = payload.seniority_level
        if payload.is_easy_apply is not None: existing_job.is_easy_apply = payload.is_easy_apply
        if payload.applicant_count: existing_job.applicant_count = payload.applicant_count
        if payload.posted_date: existing_job.posted_date = payload.posted_date
        if payload.company_logo: existing_job.company_logo = payload.company_logo
        if payload.company_url: existing_job.company_url = payload.company_url
        if payload.company_size: existing_job.company_size = payload.company_size
        if payload.company_industry: existing_job.company_industry = payload.company_industry
        if payload.hiring_manager: existing_job.hiring_manager = payload.hiring_manager

        session.add(existing_job)
        session.commit()
        session.refresh(existing_job)

        existing_intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == existing_job.id)).first()
        if existing_intel:
            existing_intel.extracted_hard_skills = intel_data.get("extracted_hard_skills", [])
            existing_intel.extracted_soft_skills = intel_data.get("extracted_soft_skills", [])
            existing_intel.experience_level_required = intel_data.get("experience_level_required", "Mid-Senior")
            existing_intel.missing_skills = intel_data.get("missing_skills", [])
            existing_intel.matched_skills = intel_data.get("matched_skills", [])
            existing_intel.summary = intel_data.get("summary", "")
            existing_intel.role_responsibilities = intel_data.get("role_responsibilities", [])
            session.add(existing_intel)
        else:
            new_intel = JobIntelligence(
                job_id=existing_job.id,
                extracted_hard_skills=intel_data.get("extracted_hard_skills", []),
                extracted_soft_skills=intel_data.get("extracted_soft_skills", []),
                experience_level_required=intel_data.get("experience_level_required", "Mid-Senior"),
                missing_skills=intel_data.get("missing_skills", []),
                matched_skills=intel_data.get("matched_skills", []),
                summary=intel_data.get("summary", ""),
                role_responsibilities=intel_data.get("role_responsibilities", [])
            )
            session.add(new_intel)
        session.commit()

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        logger.info(f"[Jobs Ingest] Updated existing Job ID={existing_job.id} in {duration_ms:.1f}ms")
        return {"job": format_job(existing_job), "intelligence": intel_data, "action": "updated"}

    # Create new job
    job = Job(
        title=payload.title,
        company=payload.company,
        location=payload.location or "Remote",
        url=payload.url,
        raw_description=payload.raw_description,
        status=payload.status or "Saved",
        match_score=intel_data["match_score"],
        salary_range=payload.salary_range or intel_data.get("salary_range", ""),
        source=payload.source or "LinkedIn",
        notes=payload.notes or "",
        workplace_type=payload.workplace_type or intel_data.get("workplace_type", ""),
        employment_type=payload.employment_type or "",
        seniority_level=payload.seniority_level or "",
        is_easy_apply=bool(payload.is_easy_apply),
        applicant_count=payload.applicant_count or "",
        posted_date=payload.posted_date or "",
        company_logo=payload.company_logo or "",
        company_url=payload.company_url or "",
        company_size=payload.company_size or "",
        company_industry=payload.company_industry or "",
        hiring_manager=payload.hiring_manager or {}
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    intelligence = JobIntelligence(
        job_id=job.id,
        extracted_hard_skills=intel_data.get("extracted_hard_skills", []),
        extracted_soft_skills=intel_data.get("extracted_soft_skills", []),
        experience_level_required=intel_data.get("experience_level_required", "Mid-Senior"),
        missing_skills=intel_data.get("missing_skills", []),
        matched_skills=intel_data.get("matched_skills", []),
        summary=intel_data.get("summary", ""),
        role_responsibilities=intel_data.get("role_responsibilities", [])
    )
    session.add(intelligence)
    session.commit()
    session.refresh(intelligence)

    duration_ms = (time.perf_counter() - start_time) * 1000.0
    logger.info(f"[Jobs Ingest] Created new Job ID={job.id} in {duration_ms:.1f}ms (score={job.match_score}%)")
    return {"job": format_job(job), "intelligence": intel_data, "action": "created"}


@app.get("/api/jobs")
def get_jobs(status: Optional[str] = None, session: Session = Depends(get_session)):
    """Retrieves all tracked jobs, optionally filtered by status, hydrated with intelligence."""
    query = select(Job)
    if status:
        query = query.where(Job.status == status)

    jobs = session.exec(query.order_by(Job.created_at.desc())).all()
    results = []
    for job in jobs:
        intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
        item = format_job(job)
        item["intelligence"] = intel.model_dump() if intel else None
        results.append(item)

    logger.info(f"[Jobs Query] Returning {len(results)} jobs (filter={repr(status)})")
    return results


@app.get("/api/jobs/active-urls")
def get_active_job_urls(session: Session = Depends(get_session)):
    """Returns active job URLs for browser extension background synchronization."""
    active_statuses = ["Saved", "Applied", "Interviewing"]
    jobs = session.exec(select(Job).where(Job.status.in_(active_statuses))).all()
    return [{"id": j.id, "url": j.url, "company": j.company, "title": j.title, "status": j.status} for j in jobs]


@app.get("/api/jobs/{job_id}")
def get_job_detail(job_id: int, session: Session = Depends(get_session)):
    """Fetches full job metadata and intelligence breakdown by ID."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
    res = format_job(job)
    res["intelligence"] = intel.model_dump() if intel else None
    return res


@app.put("/api/jobs/{job_id}/status")
def update_job_status(job_id: int, payload: StatusUpdatePayload, session: Session = Depends(get_session)):
    """Transitions a job status (e.g. Saved -> Applied -> Interviewing)."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    old_status = job.status
    job.status = payload.status
    if payload.notes is not None:
        job.notes = payload.notes
    if payload.applied_date:
        job.applied_date = payload.applied_date
    elif payload.status == "Applied" and not job.applied_date:
        job.applied_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    session.add(job)
    session.commit()
    session.refresh(job)
    logger.info(f"[Job Status] Job ID={job_id} transitioned: {old_status} -> {job.status}")
    return job.model_dump()


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, session: Session = Depends(get_session)):
    """Deletes a job and cascades deletion across learning modules and intelligence."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # 1. Cascade delete child records
    modules = session.exec(select(JobLearningModule).where(JobLearningModule.job_id == job.id)).all()
    for m in modules:
        session.delete(m)

    intels = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).all()
    for intel in intels:
        session.delete(intel)
    session.flush()

    # 2. Delete parent job
    session.delete(job)
    session.commit()
    logger.info(f"[Job Delete] Deleted Job ID={job_id} ({len(intels)} intels, {len(modules)} modules)")
    return {"message": "Job deleted successfully", "id": job_id}


# --- 3. AI Studio Endpoints ---

@app.post("/api/ai/parse-job")
def api_parse_job(payload: ParseJobPayload, session: Session = Depends(get_session)):
    """Parses arbitrary job description text without persisting it."""
    profile = session.exec(select(UserProfile)).first()
    skills = profile.skills if profile else []
    return parse_job_intelligence(
        raw_description=payload.raw_description,
        title=payload.title or "",
        company=payload.company or "",
        candidate_skills=skills
    )


@app.post("/api/ai/tailor-resume")
def api_tailor_resume(payload: TailorResumePayload, session: Session = Depends(get_session)):
    """Synthesizes role-tailored STAR achievement bullets based on job requirements."""
    profile = session.exec(select(UserProfile)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    title = payload.job_title
    company = payload.company
    description = payload.job_description
    matched_skills = []
    missing_skills = []

    if payload.job_id:
        job = session.get(Job, payload.job_id)
        if job:
            title = title or job.title
            company = company or job.company
            description = description or job.raw_description
            intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
            if intel:
                matched_skills = intel.matched_skills
                missing_skills = intel.missing_skills

    return tailor_resume(
        master_resume=profile.master_resume_text,
        job_title=title or "Software Engineer",
        company=company or "Company",
        job_description=description or "",
        matched_skills=matched_skills,
        missing_skills=missing_skills
    )


@app.post("/api/ai/cover-letter")
def api_cover_letter(payload: CoverLetterPayload, session: Session = Depends(get_session)):
    """Generates an executive cover letter and recruiter outreach message."""
    profile = session.exec(select(UserProfile)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    title = payload.job_title
    company = payload.company
    description = payload.job_description
    hiring_manager = payload.hiring_manager

    if payload.job_id:
        job = session.get(Job, payload.job_id)
        if job:
            title = title or job.title
            company = company or job.company
            description = description or job.raw_description
            if not hiring_manager and job.hiring_manager:
                hiring_manager = job.hiring_manager

    return generate_cover_letter(
        user_profile=profile.model_dump(),
        job_title=title or "Software Engineer",
        company=company or "Company",
        job_description=description or "",
        tone=payload.tone or "Confident & Professional",
        hiring_manager=hiring_manager
    )


@app.post("/api/ai/draft-answer")
def api_draft_answer(payload: DraftAnswerPayload, session: Session = Depends(get_session)):
    """Drafts authentic responses to custom ATS application questions."""
    profile = session.exec(select(UserProfile)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return draft_ats_answer(
        question=payload.question,
        job_context=payload.job_context or "",
        user_profile=profile.model_dump()
    )


@app.post("/api/ai/learning-roadmap")
def api_learning_roadmap(payload: LearningRoadmapPayload, session: Session = Depends(get_session)):
    """Constructs a 14-day technical bridging roadmap for identified skill gaps."""
    job_title = payload.job_title or "Software Engineer"
    company = ""
    raw_description = ""
    missing_skills = payload.missing_skills or []

    if payload.job_id:
        job = session.get(Job, payload.job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job with ID {payload.job_id} not found")
        job_title = job.title or job_title
        company = job.company or ""
        raw_description = job.raw_description or ""

        if not missing_skills:
            intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
            if intel and intel.missing_skills:
                missing_skills = intel.missing_skills
            elif intel and intel.extracted_hard_skills:
                profile = session.exec(select(UserProfile)).first()
                user_skills = profile.skills if profile else []
                missing_skills = [s for s in intel.extracted_hard_skills if s not in user_skills]
    elif not missing_skills:
        raise HTTPException(status_code=400, detail="Either 'job_id' or 'missing_skills' must be provided.")

    if not missing_skills:
        missing_skills = ["System Design", "Cloud Infrastructure"]

    return generate_learning_roadmap(
        missing_skills=missing_skills,
        job_title=job_title,
        company=company,
        raw_description=raw_description
    )


# --- 4. CLIFF Academy / Mini-LMS Endpoints ---

@app.post("/api/lms/jobs/{job_id}/generate-track")
def generate_lms_track(job_id: int, session: Session = Depends(get_session)):
    """Generates context-aware theoretical modules and scenario quizzes for a job's skill gaps."""
    logger.info(f"[LMS Track] Synthesizing track for Job ID={job_id}")
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
    gaps = []
    if intel and intel.missing_skills:
        gaps = intel.missing_skills
    elif intel and intel.extracted_hard_skills:
        profile = session.exec(select(UserProfile)).first()
        user_skills = profile.skills if profile else []
        gaps = [s for s in intel.extracted_hard_skills if s not in user_skills]

    if not gaps:
        gaps = ["System Design", "Cloud Architecture"]

    target_gaps = gaps[:5]
    existing_modules = session.exec(select(JobLearningModule).where(JobLearningModule.job_id == job.id)).all()
    existing_skill_map = {m.skill_gap.lower(): m for m in existing_modules}

    for skill in target_gaps:
        if skill.lower() in existing_skill_map:
            continue

        module_data = generate_job_learning_module(
            skill_gap=skill,
            job_title=job.title or "Software Engineer",
            company=job.company or "Target Company",
            company_industry=job.company_industry or "",
            company_size=job.company_size or "",
            seniority_level=job.seniority_level or "",
            raw_description=job.raw_description or ""
        )

        mod = JobLearningModule(
            job_id=job.id,
            skill_gap=skill,
            module_title=module_data.get("module_title", f"Production {skill} for {job.company}"),
            difficulty_level=module_data.get("difficulty_level", "Mid-Senior"),
            company_context_summary=module_data.get("company_context_summary", ""),
            reading_markdown=module_data.get("reading_markdown", ""),
            quiz_questions=module_data.get("quiz_questions", []),
            status="NOT_STARTED"
        )
        session.add(mod)
        session.commit()
        session.refresh(mod)

    modules = session.exec(select(JobLearningModule).where(JobLearningModule.job_id == job.id)).all()
    mastered_count = sum(1 for m in modules if m.status == "MASTERED")
    return {
        "job_id": job.id,
        "company": job.company,
        "role": job.title,
        "total_modules": len(modules),
        "mastered_modules": mastered_count,
        "modules": [m.model_dump() for m in modules]
    }


@app.get("/api/lms/jobs/{job_id}/modules")
def get_lms_modules(job_id: int, session: Session = Depends(get_session)):
    """Lists all LMS learning modules associated with a specific job."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    modules = session.exec(select(JobLearningModule).where(JobLearningModule.job_id == job.id)).all()
    mastered_count = sum(1 for m in modules if m.status == "MASTERED")
    return {
        "job_id": job.id,
        "company": job.company,
        "role": job.title,
        "total_modules": len(modules),
        "mastered_modules": mastered_count,
        "modules": [m.model_dump() for m in modules]
    }


@app.get("/api/lms/modules/{module_id}")
def get_lms_module(module_id: int, session: Session = Depends(get_session)):
    """Retrieves full theoretical reading text and quiz questions for a module."""
    mod = session.get(JobLearningModule, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
    return mod.model_dump()


@app.post("/api/lms/modules/{module_id}/submit-quiz")
def submit_lms_quiz(module_id: int, payload: QuizSubmissionPayload, session: Session = Depends(get_session)):
    """Evaluates candidate answers against situational dilemmas and returns detailed rationales."""
    mod = session.get(JobLearningModule, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail=f"Module {module_id} not found")

    questions = mod.quiz_questions or []
    if not questions:
        raise HTTPException(status_code=400, detail="Module has no quiz questions")

    correct_count = 0
    detailed_results = []
    user_answers = payload.answers or []

    for i, q in enumerate(questions):
        user_choice = user_answers[i] if i < len(user_answers) else -1
        is_correct = (user_choice == q.get("correct_index"))
        if is_correct:
            correct_count += 1
        detailed_results.append({
            "question_id": q.get("id", i + 1),
            "scenario": q.get("scenario", ""),
            "question": q.get("question", ""),
            "user_choice": user_choice,
            "correct_index": q.get("correct_index"),
            "is_correct": is_correct,
            "explanation": q.get("explanation", "")
        })

    score = int(round((correct_count / len(questions)) * 100))
    passed = score >= 80

    mod.attempts_count += 1
    if mod.best_score is None or score > mod.best_score:
        mod.best_score = score

    if passed:
        mod.status = "MASTERED"
        mod.completed_at = datetime.now(timezone.utc)
    elif mod.status != "MASTERED":
        mod.status = "IN_PROGRESS"

    mod.updated_at = datetime.now(timezone.utc)
    session.add(mod)
    session.commit()
    session.refresh(mod)

    logger.info(f"[LMS Quiz] Module {module_id} evaluated: score={score}%, passed={passed}")
    return {
        "module_id": mod.id,
        "score": score,
        "passed": passed,
        "status": mod.status,
        "best_score": mod.best_score,
        "attempts_count": mod.attempts_count,
        "detailed_results": detailed_results
    }


@app.post("/api/lms/modules/{module_id}/graduate")
def graduate_lms_skill(module_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """Graduates a mastered skill gap into the Master Candidate Profile and re-scores pipeline."""
    mod = session.get(JobLearningModule, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail=f"Module {module_id} not found")

    profile = session.exec(select(UserProfile)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    skill_to_add = mod.skill_gap.strip()
    current_skills = list(profile.skills or [])
    if not any(s.lower() == skill_to_add.lower() for s in current_skills):
        current_skills.append(skill_to_add)
        profile.skills = current_skills
        session.add(profile)

    mod.graduated_to_profile = True
    mod.updated_at = datetime.now(timezone.utc)
    session.add(mod)
    session.commit()
    session.refresh(profile)

    background_tasks.add_task(_rescore_jobs_background, profile.skills)
    logger.info(f"[LMS Graduate] Skill '{skill_to_add}' graduated to profile. Pipeline re-scoring queued.")

    return {
        "message": f"Successfully graduated '{skill_to_add}' to your Master Profile! Job re-scoring running in background.",
        "graduated_skill": skill_to_add,
        "all_skills": profile.skills
    }
