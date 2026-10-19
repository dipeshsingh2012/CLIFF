import io
import os
import re
import json
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from pydantic import BaseModel
import base64
import pypdf
import docx

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Seed sample jobs if empty
    try:
        with Session(engine) as session:
            existing_jobs = session.exec(select(Job)).first()
            if not existing_jobs:
                seed_sample_jobs(session)
    except Exception as e:
        logger.warning(f"Skipping sample job seeding: {e}")
    yield

app = FastAPI(
    title="CLIFF API - Career Intelligence & Job Framework",
    version="1.0.0",
    description="Local-first Career Intelligence and Job Tracking Engine",
    lifespan=lifespan
)

# CORS configuration allowing Chrome extensions, LinkedIn, and React frontend (including Vercel)
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


# --- API Routes ---

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "CLIFF Backend", "timestamp": datetime.utcnow().isoformat()}

# 1. Profile Endpoints
@app.get("/api/profile")
def get_user_profile(session: Session = Depends(get_session)):
    profile = session.exec(select(UserProfile)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not initialized")
    return profile

def _rescore_jobs_background(candidate_skills: List[str]):
    """Background task to recalculate job match scores without blocking the HTTP PUT /api/profile response."""
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

@app.put("/api/profile")
def update_user_profile(
    payload: ProfileUpdatePayload,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
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

    # Re-calculate match scores asynchronously so the HTTP response returns immediately (<100ms)
    if profile.skills:
        background_tasks.add_task(_rescore_jobs_background, profile.skills)

    return profile

def extract_text_from_file(filename: str, content: bytes) -> str:
    filename_lower = filename.lower()
    text = ""
    if filename_lower.endswith(".pdf"):
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages_text = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)
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
        # Fallback for plain text, markdown, etc.
        text = content.decode("utf-8", errors="replace")
    return text.strip()

@app.post("/api/profile/upload-resume")
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    logger.info("=" * 60)
    logger.info(f"--> [POST /api/profile/upload-resume] Ingesting resume: '{file.filename}' (content-type: '{file.content_type}')")
    
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
    # 1. Extract raw text from file
    try:
        raw_text = extract_text_from_file(file.filename, content)
    except Exception as e:
        logger.error(f"[POST /api/profile/upload-resume] Error extracting text from {file.filename}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    if len(raw_text) < 20:
        raise HTTPException(status_code=400, detail="Could not extract readable text from document. Please ensure the file contains readable text or export as standard PDF/DOCX.")

    logger.info(f"[POST /api/profile/upload-resume] Successfully extracted {len(raw_text)} chars of text from '{file.filename}'.")

    # 2. Decompose into structured profile with AI engine
    logger.info("[POST /api/profile/upload-resume] Parsing into structured candidate profile via AI engine...")
    parsed_profile = parse_resume_to_structured_profile(raw_text)
    logger.info(f"[POST /api/profile/upload-resume] Parsed profile: Name='{parsed_profile.get('full_name')}', Skills=({len(parsed_profile.get('skills', []))}), Blocks=({len(parsed_profile.get('experience_blocks', []))})")

    # 3. Update UserProfile in database
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
    
    # Merge existing skills with newly extracted skills
    existing_skills = profile.skills or []
    new_skills = parsed_profile.get("skills", [])
    combined_skills = sorted(list(set(existing_skills + new_skills)))
    profile.skills = combined_skills

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
    logger.info(f"[POST /api/profile/upload-resume] UserProfile ID={profile.id} successfully updated with parsed data.")

    # 4. Re-calculate match scores across all saved jobs
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
    logger.info(f"[POST /api/profile/upload-resume] Automatically re-scored {rescored_count} existing jobs against updated skills matrix.")
    logger.info("=" * 60)

    return {
        "status": "success",
        "message": f"Resume parsed successfully! Extracted {len(profile.skills)} skills and {len(profile.experience_blocks or [])} experience blocks.",
        "profile": profile,
        "rescored_jobs_count": rescored_count,
        "raw_text_length": len(raw_text)
    }

GCS_RESUMES_BUCKET = os.getenv("GCS_RESUMES_BUCKET", "cliff-resumes-prod-b3e45c44")
SERVICE_ACCOUNT_EMAIL = os.getenv("SERVICE_ACCOUNT_EMAIL", "cliff-app-sa-prod@cliff-512020.iam.gserviceaccount.com")

def _commit_parsed_profile_and_rescore(session: Session, parsed_profile: Dict[str, Any], raw_text: str) -> int:
    """Helper to commit parsed profile updates to PostgreSQL and recalculate match scores across all jobs."""
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

@app.post("/api/storage/signed-upload-url")
def get_signed_upload_url(
    payload: SignedUploadUrlRequest,
    session: Session = Depends(get_session)
):
    """
    Generates a Google Cloud Storage v4 signed PUT URL for direct browser-to-bucket uploads.
    Creates an asynchronous tracking task in PostgreSQL for frontend status polling.
    """
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

        # Resolve accurate MIME content type
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

        # Omit content_type from signed headers so browser upload is not rejected if MIME types vary
        sign_kwargs = {
            "version": "v4",
            "expiration": timedelta(minutes=15),
            "method": "PUT",
        }

        # Handle Compute Engine / Cloud Run credentials without in-memory private key
        sa_email = SERVICE_ACCOUNT_EMAIL or getattr(credentials, "service_account_email", None)
        if hasattr(credentials, "signer") and credentials.signer:
            pass
        else:
            if not credentials.valid:
                auth_req = google.auth.transport.requests.Request()
                credentials.refresh(auth_req)
            if sa_email:
                sign_kwargs["service_account_email"] = sa_email
                sign_kwargs["access_token"] = credentials.token

        signed_url = blob.generate_signed_url(**sign_kwargs)

        # Persist asynchronous tracking record
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

        logger.info(f"[Storage] Generated GCS v4 signed PUT URL for task '{task_id}' -> '{object_name}'")
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
        logger.warning(f"[Storage] Could not generate GCS signed URL ({e}), falling back to local mode.")
        return {
            "mode": "local",
            "task_id": task_id,
            "error": str(e),
            "message": "Falling back to local multipart upload."
        }

@app.get("/api/profile/upload-status/{task_id}")
def get_resume_upload_status(task_id: str, session: Session = Depends(get_session)):
    """
    Smart status polling endpoint for frontend to query async resume parsing progress.
    """
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
    """
    Pub/Sub Push Webhook triggered by GCS OBJECT_FINALIZE events.
    Downloads the resume, runs Vertex AI parsing, and updates profile + job match scores.
    """
    task = None
    try:
        if not payload.message or not payload.message.data:
            return {"status": "ignored", "reason": "Empty message data"}

        raw_json_str = base64.b64decode(payload.message.data).decode("utf-8")
        data = json.loads(raw_json_str)
        bucket_name = data.get("bucket") or GCS_RESUMES_BUCKET
        object_name = data.get("name")
        logger.info(f"[Pub/Sub Event] GCS object event received: {bucket_name}/{object_name}")

        if not object_name or not object_name.startswith("resumes/"):
            return {"status": "ignored", "reason": "Not a resume object"}

        filename_part = object_name.split("/")[-1]
        task_id = filename_part.split("_")[0] if "_" in filename_part else None

        if task_id:
            task = session.exec(select(ResumeUploadTask).where(ResumeUploadTask.task_id == task_id)).first()

        if task:
            task.status = "PROCESSING"
            task.stage_message = "Document landed in GCS. Extracting text & running Vertex AI analysis..."
            task.updated_at = datetime.now(timezone.utc)
            session.add(task)
            session.commit()

        # 1. Download file from GCS
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

        # 2. Decompose with Vertex AI
        if task:
            task.stage_message = "Decomposing skills and modular experience with Vertex AI Gemini..."
            task.updated_at = datetime.now(timezone.utc)
            session.add(task)
            session.commit()

        parsed_profile = parse_resume_to_structured_profile(raw_text)

        # 3. Commit profile and rescore jobs
        rescored_count = _commit_parsed_profile_and_rescore(session, parsed_profile, raw_text)

        # 4. Mark Task Completed
        if task:
            task.status = "COMPLETED"
            task.stage_message = f"Decomposition complete! Extracted {len(parsed_profile.get('skills', []))} skills. Re-scored {rescored_count} jobs."
            task.result_summary = f"Extracted {len(parsed_profile.get('skills', []))} skills and {len(parsed_profile.get('experience_blocks', []))} experience blocks."
            task.rescored_jobs_count = rescored_count
            task.updated_at = datetime.now(timezone.utc)
            session.add(task)
            session.commit()

        logger.info(f"[Pub/Sub Event] Successfully parsed resume {object_name}. {rescored_count} jobs rescored.")
        return {"status": "success", "task_id": task_id, "rescored_jobs_count": rescored_count}

    except Exception as e:
        logger.error(f"[Pub/Sub Event] Error processing resume upload event: {e}", exc_info=True)
        if not task:
            try:
                if 'object_name' in locals() and object_name:
                    filename_part = object_name.split("/")[-1]
                    t_id = filename_part.split("_")[0] if "_" in filename_part else None
                    if t_id:
                        task = session.exec(select(ResumeUploadTask).where(ResumeUploadTask.task_id == t_id)).first()
            except Exception:
                pass
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
    """
    Direct synchronous processing endpoint (used as backup or for local testing).
    Downloads resume from GCS, runs Vertex AI decomposition, and updates database.
    """
    bucket_name = payload.bucket_name or GCS_RESUMES_BUCKET
    if not bucket_name:
        raise HTTPException(status_code=400, detail="GCS bucket name not provided or configured.")

    task = None
    if payload.task_id:
        task = session.exec(select(ResumeUploadTask).where(ResumeUploadTask.task_id == payload.task_id)).first()

    logger.info("=" * 60)
    logger.info(f"--> [POST /api/profile/process-uploaded-resume] Downloading '{payload.object_name}' from GCS bucket '{bucket_name}'...")
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
        logger.error(f"[Storage] Error downloading from GCS: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve file from GCS: {str(e)}")

    # 1. Extract raw text
    try:
        raw_text = extract_text_from_file(filename, content)
    except Exception as e:
        logger.error(f"[Storage] Error extracting text from {filename}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    if len(raw_text) < 20:
        raise HTTPException(status_code=400, detail="Could not extract readable text from document.")

    logger.info(f"[Storage] Extracted {len(raw_text)} chars from GCS blob '{payload.object_name}'. Decomposing with AI...")
    parsed_profile = parse_resume_to_structured_profile(raw_text)

    # 2. Update UserProfile and rescore jobs via shared helper
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

    logger.info(f"[Storage] Successfully processed resume. Profile updated, {rescored_count} jobs rescored.")
    logger.info("=" * 60)

    return {
        "status": "success",
        "message": f"Resume parsed from Cloud Storage! Extracted {len(profile.skills)} skills and {len(profile.experience_blocks or [])} experience blocks.",
        "profile": profile,
        "rescored_jobs_count": rescored_count,
        "object_name": payload.object_name,
        "task_id": payload.task_id,
        "raw_text_length": len(raw_text)
    }

def format_job(job: Job) -> dict:
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

# 2. Job Endpoints
@app.post("/api/jobs")
def create_or_ingest_job(payload: JobCreatePayload, session: Session = Depends(get_session)):
    logger.info("=" * 60)
    logger.info("--> [POST /api/jobs] Ingesting/creating job request received")
    logger.info(f"    Payload title: '{payload.title}' | company: '{payload.company}' | location: '{payload.location}'")
    logger.info(f"    Workplace: '{payload.workplace_type or ''}' | Employment: '{payload.employment_type or ''}' | Easy Apply: {payload.is_easy_apply}")
    if payload.hiring_manager:
        logger.info(f"    Hiring Manager detected: {payload.hiring_manager}")
    logger.info(f"    Payload source: '{payload.source}' | status: '{payload.status}' | salary_range: '{payload.salary_range or ''}'")
    logger.info(f"    Job URL: {payload.url}")
    logger.info(f"    Raw description length: {len(payload.raw_description)} chars | Notes: {bool(payload.notes)}")
    
    try:
        logger.info("[POST /api/jobs] Fetching user profile for candidate skills comparison...")
        profile = session.exec(select(UserProfile)).first()
        if profile:
            candidate_skills = profile.skills or []
            logger.info(f"[POST /api/jobs] User profile found ('{profile.full_name}'). Candidate skills count: {len(candidate_skills)}")
            logger.info(f"[POST /api/jobs] Candidate skills: {candidate_skills}")
        else:
            candidate_skills = []
            logger.warning("[POST /api/jobs] No UserProfile found in database. Proceeding with empty candidate skills list.")

        # Check if job already exists by URL
        logger.info(f"[POST /api/jobs] Querying database for existing job with URL: '{payload.url}'...")
        existing_job = session.exec(select(Job).where(Job.url == payload.url)).first()

        if existing_job:
            logger.info(f"[POST /api/jobs] Match found: Existing Job ID={existing_job.id} ('{existing_job.title}' @ '{existing_job.company}', status='{existing_job.status}', match_score={existing_job.match_score}%). Updating existing record.")
        else:
            logger.info(f"[POST /api/jobs] No existing job found with URL: '{payload.url}'. Creating new record.")

        # Extract intelligence via AI Engine
        logger.info(f"[POST /api/jobs] Invoking AI intelligence extraction (parse_job_intelligence) for '{payload.title}' at '{payload.company}'...")
        start_time = datetime.utcnow()
        intel_data = parse_job_intelligence(
            raw_description=payload.raw_description,
            title=payload.title,
            company=payload.company,
            candidate_skills=candidate_skills
        )
        duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000.0

        logger.info(f"[POST /api/jobs] AI analysis completed in {duration_ms:.1f}ms:")
        logger.info(f"    Calculated Match Score : {intel_data.get('match_score')}%")
        logger.info(f"    Detected Salary Range  : '{intel_data.get('salary_range') or 'None detected'}'")
        logger.info(f"    Experience Level       : {intel_data.get('experience_level_required', 'Unknown')}")
        logger.info(f"    Extracted Hard Skills  : ({len(intel_data.get('extracted_hard_skills', []))}) {intel_data.get('extracted_hard_skills', [])}")
        logger.info(f"    Extracted Soft Skills  : ({len(intel_data.get('extracted_soft_skills', []))}) {intel_data.get('extracted_soft_skills', [])}")
        logger.info(f"    Matched Skills         : ({len(intel_data.get('matched_skills', []))}) {intel_data.get('matched_skills', [])}")
        logger.info(f"    Missing Skills (Gaps)  : ({len(intel_data.get('missing_skills', []))}) {intel_data.get('missing_skills', [])}")
        if intel_data.get("summary"):
            logger.info(f"    Role Summary           : {intel_data.get('summary')[:140]}...")
        if intel_data.get("role_responsibilities"):
            logger.info(f"    Responsibilities count : {len(intel_data.get('role_responsibilities', []))}")

        if existing_job:
            logger.info(f"[POST /api/jobs] Updating Job record ID={existing_job.id}...")
            existing_job.title = payload.title
            existing_job.company = payload.company
            existing_job.location = payload.location or existing_job.location
            existing_job.raw_description = payload.raw_description
            existing_job.match_score = intel_data["match_score"]
            if payload.salary_range:
                existing_job.salary_range = payload.salary_range
            elif intel_data.get("salary_range"):
                existing_job.salary_range = intel_data["salary_range"]
            
            # Update extended fields if provided
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
            logger.info(f"[POST /api/jobs] Job ID={existing_job.id} table fields updated and committed.")

            logger.info(f"[POST /api/jobs] Updating JobIntelligence for Job ID={existing_job.id}...")
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
                session.commit()
                logger.info(f"[POST /api/jobs] JobIntelligence record ID={existing_intel.id} updated and committed.")
            else:
                logger.info(f"[POST /api/jobs] Creating missing JobIntelligence record for Job ID={existing_job.id}...")
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
                logger.info(f"[POST /api/jobs] New JobIntelligence record created and committed for Job ID={existing_job.id}.")

            logger.info(f"<-- [POST /api/jobs] Response dispatched: updated Job ID={existing_job.id} ('{existing_job.title}' @ '{existing_job.company}'). Action='updated'.")
            logger.info("=" * 60)
            return {"job": format_job(existing_job), "intelligence": intel_data, "action": "updated"}

        # Create new job
        logger.info(f"[POST /api/jobs] Creating new Job record in database (title='{payload.title}', company='{payload.company}')...")
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
        logger.info(f"[POST /api/jobs] Job record persisted and assigned ID={job.id}.")

        logger.info(f"[POST /api/jobs] Creating JobIntelligence record for Job ID={job.id}...")
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
        logger.info(f"[POST /api/jobs] JobIntelligence persisted and assigned ID={intelligence.id}.")

        logger.info(f"<-- [POST /api/jobs] Response dispatched: created Job ID={job.id} ('{job.title}' @ '{job.company}'). Action='created'.")
        logger.info("=" * 60)
        return {"job": format_job(job), "intelligence": intel_data, "action": "created"}

    except Exception as e:
        logger.error(f"<-- [POST /api/jobs] Error processing job ingestion for URL '{payload.url}': {e}", exc_info=True)
        logger.info("=" * 60)
        raise

@app.get("/api/jobs")
def get_jobs(status: Optional[str] = None, session: Session = Depends(get_session)):
    logger.info("=" * 60)
    logger.info(f"--> [GET /api/jobs] Request received to list jobs. Filter: status={repr(status) if status else 'None (All jobs)'}")
    try:
        query = select(Job)
        if status:
            logger.info(f"[GET /api/jobs] Applying filter: Job.status == '{status}'")
            query = query.where(Job.status == status)

        logger.info("[GET /api/jobs] Executing query ordered by Job.created_at DESC...")
        jobs = session.exec(query.order_by(Job.created_at.desc())).all()
        logger.info(f"[GET /api/jobs] Query returned {len(jobs)} job record(s).")

        # Distribution breakdown
        status_counts: Dict[str, int] = {}
        for j in jobs:
            status_counts[j.status] = status_counts.get(j.status, 0) + 1
        logger.info(f"[GET /api/jobs] Job distribution by status: {status_counts}")

        if jobs:
            sample_preview = [
                f"#{j.id} '{j.title}' @ '{j.company}' [{j.status}, score={j.match_score}%]"
                for j in jobs[:5]
            ]
            logger.info(f"[GET /api/jobs] Sample jobs ({min(5, len(jobs))}/{len(jobs)}): {', '.join(sample_preview)}{' ...' if len(jobs) > 5 else ''}")
        else:
            logger.info("[GET /api/jobs] No jobs found matching current filter criteria.")

        logger.info("[GET /api/jobs] Hydrating job items with JobIntelligence data...")
        results = []
        hydrated_intel_count = 0
        for job in jobs:
            intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
            if intel:
                hydrated_intel_count += 1
            item = format_job(job)
            item["intelligence"] = intel.model_dump() if intel else None
            results.append(item)

        logger.info(f"[GET /api/jobs] Successfully hydrated {hydrated_intel_count}/{len(results)} jobs with intelligence payloads.")
        logger.info(f"<-- [GET /api/jobs] Dispatching response with {len(results)} job(s).")
        logger.info("=" * 60)
        return results
    except Exception as e:
        logger.error(f"<-- [GET /api/jobs] Error retrieving jobs list: {e}", exc_info=True)
        logger.info("=" * 60)
        raise

@app.get("/api/jobs/active-urls")
def get_active_job_urls(session: Session = Depends(get_session)):
    """Used by Chrome extension background worker to discover active applications to sync"""
    logger.info("--> [GET /api/jobs/active-urls] Received request for active job URLs from extension/client")
    active_statuses = ["Saved", "Applied", "Interviewing"]
    logger.info(f"[GET /api/jobs/active-urls] Filtering jobs where status in {active_statuses}...")
    jobs = session.exec(select(Job).where(Job.status.in_(active_statuses))).all()
    logger.info(f"<-- [GET /api/jobs/active-urls] Returning {len(jobs)} active job URL(s).")
    return [{"id": j.id, "url": j.url, "company": j.company, "title": j.title, "status": j.status} for j in jobs]

@app.get("/api/jobs/{job_id}")
def get_job_detail(job_id: int, session: Session = Depends(get_session)):
    logger.info(f"--> [GET /api/jobs/{job_id}] Request detail for job ID={job_id}")
    job = session.get(Job, job_id)
    if not job:
        logger.warning(f"<-- [GET /api/jobs/{job_id}] Job ID={job_id} not found in database.")
        raise HTTPException(status_code=404, detail="Job not found")
    logger.info(f"[GET /api/jobs/{job_id}] Found job: '{job.title}' @ '{job.company}' [status='{job.status}', match={job.match_score}%]. Fetching intelligence...")
    intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
    logger.info(f"<-- [GET /api/jobs/{job_id}] Successfully dispatched detail payload (intelligence present: {intel is not None}).")
    res = format_job(job)
    res["intelligence"] = intel.model_dump() if intel else None
    return res

@app.put("/api/jobs/{job_id}/status")
def update_job_status(job_id: int, payload: StatusUpdatePayload, session: Session = Depends(get_session)):
    logger.info(f"--> [PUT /api/jobs/{job_id}/status] Request to update status for Job ID={job_id}. Target status='{payload.status}', applied_date='{payload.applied_date}', notes_provided={payload.notes is not None}")
    job = session.get(Job, job_id)
    if not job:
        logger.warning(f"<-- [PUT /api/jobs/{job_id}/status] Job ID={job_id} not found in database.")
        raise HTTPException(status_code=404, detail="Job not found")
    old_status = job.status
    job.status = payload.status
    if payload.notes is not None:
        job.notes = payload.notes
    if payload.applied_date:
        job.applied_date = payload.applied_date
    elif payload.status == "Applied" and not job.applied_date:
        job.applied_date = datetime.utcnow().strftime("%Y-%m-%d")

    session.add(job)
    session.commit()
    session.refresh(job)
    logger.info(f"<-- [PUT /api/jobs/{job_id}/status] Successfully updated Job ID={job_id} status from '{old_status}' to '{job.status}'.")
    return job.model_dump()

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, session: Session = Depends(get_session)):
    logger.info(f"--> [DELETE /api/jobs/{job_id}] Request to delete Job ID={job_id}")
    job = session.get(Job, job_id)
    if not job:
        logger.warning(f"<-- [DELETE /api/jobs/{job_id}] Job ID={job_id} not found in database.")
        raise HTTPException(status_code=404, detail="Job not found")

    # 1. Delete all associated JobLearningModule and JobIntelligence records first and flush to satisfy foreign key constraint
    modules = session.exec(select(JobLearningModule).where(JobLearningModule.job_id == job.id)).all()
    for m in modules:
        logger.info(f"[DELETE /api/jobs/{job_id}] Removing associated JobLearningModule record ID={m.id} ('{m.skill_gap}')...")
        session.delete(m)

    intels = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).all()
    for intel in intels:
        logger.info(f"[DELETE /api/jobs/{job_id}] Removing associated JobIntelligence record ID={intel.id}...")
        session.delete(intel)
    session.flush()

    # 2. Delete parent Job record
    logger.info(f"[DELETE /api/jobs/{job_id}] Removing Job record ID={job.id} ('{job.title}' @ '{job.company}')...")
    session.delete(job)
    session.commit()
    logger.info(f"<-- [DELETE /api/jobs/{job_id}] Successfully deleted Job ID={job_id}, {len(intels)} intelligence record(s), and {len(modules)} learning module(s).")
    return {"message": "Job deleted successfully", "id": job_id}

# 3. AI Intelligence Endpoints

@app.post("/api/ai/parse-job")
def api_parse_job(payload: ParseJobPayload, session: Session = Depends(get_session)):
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

        # Fetch intelligence & gaps from database if not explicitly provided
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

# 4. CLIFF Academy / Job-Anchored Mini-LMS Endpoints

@app.post("/api/lms/jobs/{job_id}/generate-track")
def generate_lms_track(job_id: int, session: Session = Depends(get_session)):
    logger.info(f"--> [POST /api/lms/jobs/{job_id}/generate-track] Generating LMS track for Job ID={job_id}")
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

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

    # Target up to 5 skill gaps
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
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

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
    mod = session.get(JobLearningModule, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    return mod.model_dump()

@app.post("/api/lms/modules/{module_id}/submit-quiz")
def submit_lms_quiz(module_id: int, payload: QuizSubmissionPayload, session: Session = Depends(get_session)):
    mod = session.get(JobLearningModule, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

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
    else:
        if mod.status != "MASTERED":
            mod.status = "IN_PROGRESS"

    mod.updated_at = datetime.now(timezone.utc)
    session.add(mod)
    session.commit()
    session.refresh(mod)

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
    mod = session.get(JobLearningModule, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

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

    # Schedule background recalculation of job scores
    background_tasks.add_task(_rescore_jobs_background, profile.skills)

    return {
        "message": f"Successfully graduated '{skill_to_add}' to your Master Profile! Job re-scoring running in background.",
        "graduated_skill": skill_to_add,
        "all_skills": profile.skills
    }

