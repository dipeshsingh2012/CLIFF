"""CLIFF Data Models.

Defines SQLModel ORM entities representing candidate profiles, tracked jobs,
extracted intelligence, asynchronous upload tasks, and mini-LMS bridging modules.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Column, JSON, Text


class UserProfile(SQLModel, table=True):
    """Represents the candidate's master profile, skills matrix, and standard ATS answers.
    
    Serves as the central ground truth for resume tailoring, AI match score computation,
    and browser extension form auto-filling.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: str
    phone: str
    linkedin_url: str = Field(default="")
    github_url: str = Field(default="")
    portfolio_url: str = Field(default="")
    location: str = Field(default="")
    
    # Complete plain-text master resume ingested by the AI tailoring engine
    master_resume_text: str = Field(default="", sa_column=Column(Text))
    
    # Master skills matrix (deduplicated array of strings)
    skills: List[str] = Field(default=[], sa_column=Column(JSON))
    
    # Ground-truth work history blocks for ATS autofill and bullet point extraction
    experience_blocks: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    
    # Pre-canned form answers (e.g. work authorization, notice period, compensation)
    standard_answers: Dict[str, str] = Field(default={}, sa_column=Column(JSON))


class Job(SQLModel, table=True):
    """Represents an ingested job application tracked in the candidate's pipeline."""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    company: str
    location: str = Field(default="Remote")
    url: str = Field(unique=True, index=True)
    raw_description: str = Field(sa_column=Column(Text))
    
    # Pipeline status: 'Saved', 'Applied', 'Interviewing', 'Rejected', 'Offer'
    status: str = Field(default="Saved")
    match_score: int = Field(default=0)
    salary_range: Optional[str] = Field(default="")
    source: Optional[str] = Field(default="LinkedIn")
    notes: Optional[str] = Field(default="")
    applied_date: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Extended LinkedIn & ATS metadata
    workplace_type: Optional[str] = Field(default="")
    employment_type: Optional[str] = Field(default="")
    seniority_level: Optional[str] = Field(default="")
    is_easy_apply: Optional[bool] = Field(default=False)
    applicant_count: Optional[str] = Field(default="")
    posted_date: Optional[str] = Field(default="")
    company_logo: Optional[str] = Field(default="")
    company_url: Optional[str] = Field(default="")
    company_size: Optional[str] = Field(default="")
    company_industry: Optional[str] = Field(default="")
    hiring_manager: Optional[Dict[str, Any]] = Field(default={}, sa_column=Column(JSON))


class JobIntelligence(SQLModel, table=True):
    """Extracted technical requirements, skill gaps, and match breakdown for a tracked job."""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="job.id", index=True)
    extracted_hard_skills: List[str] = Field(default=[], sa_column=Column(JSON))
    extracted_soft_skills: List[str] = Field(default=[], sa_column=Column(JSON))
    experience_level_required: str = Field(default="Mid-Senior")
    missing_skills: List[str] = Field(default=[], sa_column=Column(JSON))
    matched_skills: List[str] = Field(default=[], sa_column=Column(JSON))
    summary: Optional[str] = Field(default="")
    role_responsibilities: List[str] = Field(default=[], sa_column=Column(JSON))


class ResumeUploadTask(SQLModel, table=True):
    """Tracks asynchronous resume upload and decomposition lifecycle across Cloud Storage & Vertex AI."""
    task_id: str = Field(primary_key=True, index=True)
    filename: str
    object_name: str
    bucket_name: str
    
    # Lifecycle: 'PENDING', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED'
    status: str = Field(default="PENDING")
    stage_message: str = Field(default="Waiting for upload to Cloud Storage...")
    error_message: Optional[str] = Field(default=None)
    result_summary: Optional[str] = Field(default=None)
    rescored_jobs_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class JobLearningModule(SQLModel, table=True):
    """Job-anchored theoretical learning module and scenario evaluation quiz for a targeted skill gap."""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="job.id", index=True)
    skill_gap: str = Field(index=True)
    module_title: str
    difficulty_level: str = Field(default="Mid-Senior")  # 'Foundational', 'Mid-Senior', 'Senior', 'Staff / Principal'
    company_context_summary: Optional[str] = Field(default="")
    reading_markdown: str = Field(sa_column=Column(Text))
    quiz_questions: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    
    # Progress status: 'NOT_STARTED', 'IN_PROGRESS', 'MASTERED'
    status: str = Field(default="NOT_STARTED")
    best_score: Optional[int] = Field(default=None)
    attempts_count: int = Field(default=0)
    completed_at: Optional[datetime] = Field(default=None)
    graduated_to_profile: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
