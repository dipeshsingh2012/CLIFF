import os
from typing import Generator
from sqlalchemy import text
from sqlmodel import SQLModel, create_engine, Session, select
from models import UserProfile, Job, JobIntelligence, ResumeUploadTask

import logging

logger = logging.getLogger("cliff.database")

INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME")
DB_USER = os.getenv("DB_USER", "cliff_app")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "cliff")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# Construct PostgreSQL connection URL
if INSTANCE_CONNECTION_NAME:
    # Connect via Cloud SQL Unix socket mounted at /cloudsql/<INSTANCE_CONNECTION_NAME>
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@/{DB_NAME}?host=/cloudsql/{INSTANCE_CONNECTION_NAME}"
    logger.info(f"Connecting to Cloud SQL PostgreSQL: {INSTANCE_CONNECTION_NAME}/{DB_NAME}")
elif os.getenv("DATABASE_URL"):
    raw_url = os.getenv("DATABASE_URL")
    if raw_url.startswith("postgresql://"):
        DATABASE_URL = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        DATABASE_URL = raw_url
    logger.info("Connecting to PostgreSQL using DATABASE_URL")
else:
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    logger.info(f"Connecting to PostgreSQL: {DB_HOST}:{DB_PORT}/{DB_NAME}")

# Connection pool settings
engine_args = {
    "echo": False,
}
if "sqlite" in DATABASE_URL:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args.update({
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
        "pool_pre_ping": True,
        "pool_recycle": 1800,
    })

engine = create_engine(DATABASE_URL, **engine_args)


def create_db_and_tables():
    """Initializes PostgreSQL tables and optional pgvector extension."""
    try:
        # Enable pgvector if permissions allow
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
        except Exception as ve:
            logger.debug(f"pgvector extension check note: {ve}")

        SQLModel.metadata.create_all(engine)
        seed_default_profile_if_empty()
        logger.info("PostgreSQL database and tables initialized successfully.")
    except Exception as e:
        logger.error(f"Error during PostgreSQL initialization: {e}", exc_info=True)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

def seed_default_profile_if_empty():
    with Session(engine) as session:
        existing = session.exec(select(UserProfile)).first()
        if not existing:
            default_profile = UserProfile(
                full_name="Alex Rivera",
                email="alex.rivera@example.com",
                phone="+1 (555) 234-5678",
                linkedin_url="https://linkedin.com/in/alex-rivera-dev",
                github_url="https://github.com/alexrivera",
                portfolio_url="https://alexrivera.dev",
                location="San Francisco, CA / Remote",
                master_resume_text="""ALEX RIVERA
San Francisco, CA | alex.rivera@example.com | (555) 234-5678 | linkedin.com/in/alex-rivera-dev | github.com/alexrivera

SUMMARY
Results-oriented Senior Full-Stack & AI Systems Engineer with 6+ years of experience designing and deploying scalable web applications, distributed backend microservices, and LLM-powered enterprise tooling. Proven track record of improving system latency by 45%, architecting fault-tolerant APIs in Python & TypeScript, and leading high-performing cross-functional teams.

CORE SKILLS
- Languages: Python, TypeScript, JavaScript, SQL, HTML5, CSS3, Go
- Backend & Cloud: FastAPI, Node.js, Express, PostgreSQL, Redis, Docker, Kubernetes, AWS (ECS, Lambda, S3, RDS), Google Cloud
- Frontend & UI: React, Next.js, Vite, Tailwind CSS, Redux Toolkit, Webpack, Responsive Design
- AI & ML: Gemini API, OpenAI API, LangChain, RAG, Prompt Engineering, Vector Databases (Pinecone, ChromaDB, Qdrant)
- DevOps & Tools: Git, CI/CD (GitHub Actions), Terraform, Linux, RESTful APIs, GraphQL, Agile/Scrum

EXPERIENCE
Staff Software Engineer | CloudVenture Labs | 2022 - Present
- Architected and delivered an AI-driven automation platform handling 2.5M+ requests/day with 99.99% uptime using FastAPI and PostgreSQL.
- Implemented RAG pipelines and semantic vector search decreasing customer query response times from 3.2s to 650ms.
- Spearheaded modern frontend redevelopment in React 18, Vite, and Tailwind CSS, increasing user session engagement by 38%.
- Mentored 7 junior and mid-level engineers, establishing engineering quality standards, CI/CD automated linting, and 88% test coverage.

Senior Full Stack Engineer | Apex Financial Tech | 2019 - 2022
- Engineered high-throughput microservices in Python and Node.js for real-time transaction reconciliation across 12 banking partners.
- Designed dynamic financial dashboard using React, TypeScript, and WebSocket telemetry for 80,000 active institutional users.
- Reduced database read latencies by 60% through strategic Redis caching and PostgreSQL query optimization.

EDUCATION
B.S. in Computer Science | University of California, Berkeley | 2015 - 2019
""",
                skills=[
                    "Python", "FastAPI", "TypeScript", "React", "Next.js", "Docker", "Kubernetes",
                    "AWS", "PostgreSQL", "SQLAlchemy", "Redis", "Tailwind CSS", "REST APIs",
                    "GraphQL", "OpenAI API", "Google Gemini API", "RAG", "Vector Databases",
                    "System Design", "CI/CD", "Git", "Microservices", "Node.js"
                ],
                experience_blocks=[
                    {
                        "company": "CloudVenture Labs",
                        "title": "Staff Software Engineer",
                        "location": "San Francisco, CA",
                        "start_date": "2022-03",
                        "end_date": "Present",
                        "highlights": [
                            "Architected enterprise AI automation platform using FastAPI, React, and PostgreSQL serving 2.5M+ daily requests.",
                            "Decreased query latency by 80% via vector search and caching.",
                            "Led team of 7 engineers and drove CI/CD pipelines."
                        ]
                    },
                    {
                        "company": "Apex Financial Tech",
                        "title": "Senior Full Stack Engineer",
                        "location": "San Francisco, CA",
                        "start_date": "2019-06",
                        "end_date": "2022-02",
                        "highlights": [
                            "Built high-throughput payment reconciliation microservices in Python and Node.js.",
                            "Designed real-time React analytics dashboards with WebSocket telemetry."
                        ]
                    }
                ],
                standard_answers={
                    "work_authorization": "Authorized to work in the United States without sponsorship.",
                    "requires_sponsorship": "No",
                    "notice_period": "2 weeks",
                    "expected_salary": "$175,000 - $195,000 USD",
                    "preferred_location": "Remote or Hybrid (San Francisco Bay Area)",
                    "why_us": "I admire your mission of building impactful, developer-friendly products at scale. My experience designing reliable distributed systems and AI workflows aligns directly with your technical goals."
                }
            )
            session.add(default_profile)
            session.commit()
