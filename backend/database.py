import os
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session, select
from models import UserProfile, Job, JobIntelligence

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///cliff.db")

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def migrate_job_columns():
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(job);"))
            existing_cols = {row[1] for row in result.fetchall()}
            
            columns_to_add = {
                "workplace_type": "TEXT DEFAULT ''",
                "employment_type": "TEXT DEFAULT ''",
                "seniority_level": "TEXT DEFAULT ''",
                "is_easy_apply": "BOOLEAN DEFAULT 0",
                "applicant_count": "TEXT DEFAULT ''",
                "posted_date": "TEXT DEFAULT ''",
                "company_logo": "TEXT DEFAULT ''",
                "company_url": "TEXT DEFAULT ''",
                "company_size": "TEXT DEFAULT ''",
                "company_industry": "TEXT DEFAULT ''",
                "hiring_manager": "JSON DEFAULT '{}'",
            }
            for col_name, col_def in columns_to_add.items():
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE job ADD COLUMN {col_name} {col_def};"))
            conn.commit()
    except Exception as e:
        # If running on non-SQLite or table doesn't exist yet, create_all will handle it
        pass

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    migrate_job_columns()
    seed_default_profile_if_empty()

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

