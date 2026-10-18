import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from pydantic import BaseModel

from models import UserProfile, Job, JobIntelligence
from database import engine, create_db_and_tables, get_session
from ai_engine import (
    parse_job_intelligence,
    tailor_resume,
    generate_cover_letter,
    draft_ats_answer,
    generate_learning_roadmap
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
    with Session(engine) as session:
        existing_jobs = session.exec(select(Job)).first()
        if not existing_jobs:
            seed_sample_jobs(session)
    yield

app = FastAPI(
    title="CLIFF API - Career Intelligence & Job Framework",
    version="1.0.0",
    description="Local-first Career Intelligence and Job Tracking Engine",
    lifespan=lifespan
)

# CORS configuration allowing Chrome extensions and React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    missing_skills: List[str]
    job_title: Optional[str] = "Software Engineer"


# --- API Routes ---

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

@app.put("/api/profile")
def update_user_profile(payload: ProfileUpdatePayload, session: Session = Depends(get_session)):
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

    # Re-calculate match scores for all saved jobs with updated candidate skills
    jobs = session.exec(select(Job)).all()
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
    session.commit()

    return profile

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
    intel = session.exec(select(JobIntelligence).where(JobIntelligence.job_id == job.id)).first()
    if intel:
        logger.info(f"[DELETE /api/jobs/{job_id}] Removing associated JobIntelligence record ID={intel.id}...")
        session.delete(intel)
    logger.info(f"[DELETE /api/jobs/{job_id}] Removing Job record ID={job.id} ('{job.title}' @ '{job.company}')...")
    session.delete(job)
    session.commit()
    logger.info(f"<-- [DELETE /api/jobs/{job_id}] Successfully deleted Job ID={job_id}.")
    return {"message": "Job deleted successfully"}

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
def api_learning_roadmap(payload: LearningRoadmapPayload):
    return generate_learning_roadmap(
        missing_skills=payload.missing_skills,
        job_title=payload.job_title or "Software Engineer"
    )
