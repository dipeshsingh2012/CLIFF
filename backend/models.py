from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Column, JSON, Text

class UserProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: str
    phone: str
    linkedin_url: str = Field(default="")
    github_url: str = Field(default="")
    portfolio_url: str = Field(default="")
    location: str = Field(default="")
    master_resume_text: str = Field(default="", sa_column=Column(Text))
    skills: List[str] = Field(default=[], sa_column=Column(JSON))
    experience_blocks: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON)) # Previous roles for autofill
    standard_answers: Dict[str, str] = Field(default={}, sa_column=Column(JSON)) # Form answers: notice period, salary, etc.

class Job(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    company: str
    location: str = Field(default="Remote")
    url: str = Field(unique=True, index=True)
    raw_description: str = Field(sa_column=Column(Text))
    status: str = Field(default="Saved") # Saved, Applied, Interviewing, Rejected, Offer
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
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="job.id", index=True)
    extracted_hard_skills: List[str] = Field(default=[], sa_column=Column(JSON))
    extracted_soft_skills: List[str] = Field(default=[], sa_column=Column(JSON))
    experience_level_required: str = Field(default="Mid-Senior")
    missing_skills: List[str] = Field(default=[], sa_column=Column(JSON))
    matched_skills: List[str] = Field(default=[], sa_column=Column(JSON))
    summary: Optional[str] = Field(default="")
    role_responsibilities: List[str] = Field(default=[], sa_column=Column(JSON))
