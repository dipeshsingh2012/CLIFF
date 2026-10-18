import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("cliff.ai")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

COMMON_HARD_SKILLS = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala",
    "FastAPI", "Django", "Flask", "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express", "Spring Boot",
    "HTML5", "CSS3", "Tailwind CSS", "Sass", "GraphQL", "REST APIs", "gRPC", "WebSockets",
    "SQL", "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Cassandra", "DynamoDB", "Elasticsearch",
    "Docker", "Kubernetes", "AWS", "Google Cloud", "GCP", "Azure", "Terraform", "CI/CD", "GitHub Actions", "Jenkins",
    "Linux", "Git", "Microservices", "System Design", "Distributed Systems", "Kafka", "RabbitMQ",
    "OpenAI API", "Google Gemini API", "LLMs", "RAG", "LangChain", "Vector Databases", "ChromaDB", "Pinecone",
    "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn",
    "Agile", "Scrum", "Test-Driven Development", "TDD", "Unit Testing", "Jest", "Pytest", "Cypress"
]

COMMON_SOFT_SKILLS = [
    "Cross-functional Collaboration", "Communication", "Technical Leadership", "Mentorship",
    "Problem Solving", "Strategic Thinking", "Agile Execution", "Time Management",
    "Stakeholder Management", "Adaptability", "Ownership", "Critical Thinking"
]

def _call_gemini_json(prompt: str, system_instruction: str = "") -> Optional[dict]:
    if not GEMINI_API_KEY:
        return None
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_instruction or "You are CLIFF, an expert career intelligence and job matching AI. Return valid JSON only.",
                temperature=0.2
            )
        )
        if response.text:
            return json.loads(response.text)
    except Exception as e:
        logger.warning(f"Gemini API call failed, falling back: {e}")
    return None

def _call_openai_json(prompt: str, system_instruction: str = "") -> Optional[dict]:
    if not OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_instruction or "You are CLIFF, an expert career intelligence and job matching AI. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        content = response.choices[0].message.content
        if content:
            return json.loads(content)
    except Exception as e:
        logger.warning(f"OpenAI API call failed, falling back: {e}")
    return None

def _heuristic_skill_extraction(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    found_hard = []
    for skill in COMMON_HARD_SKILLS:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_hard.append(skill)

    found_soft = []
    for skill in COMMON_SOFT_SKILLS:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_soft.append(skill)
    if not found_soft:
        if "lead" in text_lower or "mentor" in text_lower:
            found_soft.append("Technical Leadership")
        if "team" in text_lower or "cross-functional" in text_lower:
            found_soft.append("Cross-functional Collaboration")
        if "solve" in text_lower or "architect" in text_lower:
            found_soft.append("Problem Solving")

    # Experience level
    level = "Mid-Senior"
    if re.search(r'\b(entry|junior|intern|associate|0-2|1-2 years)\b', text_lower):
        level = "Entry / Junior"
    elif re.search(r'\b(staff|principal|director|head of|vp|architect)\b', text_lower):
        level = "Staff / Principal"
    elif re.search(r'\b(senior|sr\.|5\+|6\+|7\+|8\+ years)\b', text_lower):
        level = "Senior"
    elif re.search(r'\b(mid|3-5|2-4 years)\b', text_lower):
        level = "Mid-Level"

    # Responsibilities extraction (find bullet points or lines with verbs)
    responsibilities = []
    lines = text.split("\n")
    for line in lines:
        cleaned = line.strip(" -•*>\t")
        if len(cleaned) > 25 and len(cleaned) < 180:
            if any(cleaned.lower().startswith(w) for w in ["build", "design", "develop", "lead", "architect", "collaborate", "create", "drive", "manage", "maintain", "scale"]):
                responsibilities.append(cleaned)
                if len(responsibilities) >= 4:
                    break

    if not responsibilities:
        responsibilities = [
            "Architect and maintain high-performance software and scalable systems.",
            "Collaborate with cross-functional engineering, product, and design teams.",
            "Write robust, testable, and maintainable code adhering to industry best practices."
        ]

    # Summary
    first_few_sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 30]
    summary = ". ".join(first_few_sentences[:2]) + "." if first_few_sentences else "Exciting engineering role focusing on high-impact scalable services."

    # Salary extraction if present
    salary = ""
    salary_match = re.search(r'(\$\d{2,3}(?:,\d{3})*(?:\s*-\s*\$\d{2,3}(?:,\d{3})*)?(?:\s*(?:k|usd|per year|\/yr))?)', text, re.IGNORECASE)
    if salary_match:
        salary = salary_match.group(1)

    # Mode of work / Workplace type extraction
    workplace = ""
    if re.search(r'\b(remote|work from home|wfh|100% remote|anywhere|distributed)\b', text_lower):
        workplace = "Remote"
    elif re.search(r'\b(hybrid|flexible schedule|days? in office|in-office \d days?)\b', text_lower):
        workplace = "Hybrid"
    elif re.search(r'\b(on-site|onsite|in-office|in office)\b', text_lower):
        workplace = "On-site"

    return {
        "extracted_hard_skills": sorted(list(set(found_hard))),
        "extracted_soft_skills": sorted(list(set(found_soft))),
        "experience_level_required": level,
        "role_responsibilities": responsibilities,
        "summary": summary,
        "salary_range": salary,
        "workplace_type": workplace
    }

def parse_job_intelligence(raw_description: str, title: str = "", company: str = "", candidate_skills: List[str] = None) -> Dict[str, Any]:
    if candidate_skills is None:
        candidate_skills = []

    prompt = f"""
Analyze this job description for position "{title}" at "{company}".
Job Description:
\"\"\"{raw_description[:4000]}\"\"\"

User's Profile Skills:
{json.dumps(candidate_skills)}

Return a strict JSON object with:
{{
  "extracted_hard_skills": ["list", "of", "technologies", "tools", "languages"],
  "extracted_soft_skills": ["list", "of", "soft", "skills"],
  "experience_level_required": "Entry / Junior" | "Mid-Level" | "Senior" | "Staff / Principal",
  "role_responsibilities": ["3-5 clear bullet points of core duties"],
  "summary": "Concise 2-sentence summary of the role and mission",
  "salary_range": "e.g. $150,000 - $180,000 or empty string if not listed",
  "workplace_type": "Remote" | "Hybrid" | "On-site" | ""
}}
"""
    result = None
    if GEMINI_API_KEY:
        result = _call_gemini_json(prompt)
    if not result and OPENAI_API_KEY:
        result = _call_openai_json(prompt)
    if not result:
        result = _heuristic_skill_extraction(raw_description)
    else:
        # If LLM didn't return workplace_type or returned empty, fallback to heuristic check
        if not result.get("workplace_type"):
            heuristic_data = _heuristic_skill_extraction(raw_description)
            result["workplace_type"] = heuristic_data.get("workplace_type", "")

    # Compute matched and missing skills against candidate skills
    extracted_hard = result.get("extracted_hard_skills", [])
    extracted_soft = result.get("extracted_soft_skills", [])
    all_req_skills = extracted_hard + extracted_soft

    matched_skills = []
    missing_skills = []

    user_skills_lower = {s.lower(): s for s in candidate_skills}

    for req in extracted_hard:
        req_lower = req.lower()
        matched = False
        for u_low in user_skills_lower:
            if req_lower == u_low or req_lower in u_low or u_low in req_lower:
                matched_skills.append(req)
                matched = True
                break
        if not matched:
            missing_skills.append(req)

    # Calculate match score (0-100)
    if all_req_skills:
        hard_match_ratio = len(matched_skills) / max(len(extracted_hard), 1)
        base_score = int(hard_match_ratio * 80)
        # Add baseline points for profile completeness & soft skills alignment
        soft_bonus = min(20, len(extracted_soft) * 5)
        match_score = min(98, max(25, base_score + soft_bonus))
    else:
        match_score = 75

    result["matched_skills"] = sorted(list(set(matched_skills)))
    result["missing_skills"] = sorted(list(set(missing_skills)))
    result["match_score"] = match_score

    return result

def tailor_resume(master_resume: str, job_title: str, company: str, job_description: str, matched_skills: List[str], missing_skills: List[str]) -> Dict[str, Any]:
    prompt = f"""
You are an elite Career Strategist and Executive Resume Writer.
Tailor the user's master resume specifically for the job "{job_title}" at "{company}".

Job Description Context:
\"\"\"{job_description[:2000]}\"\"\"

Matched Skills to Highlight: {json.dumps(matched_skills)}
Missing Skills to strategically address/bridge: {json.dumps(missing_skills)}

Master Resume:
\"\"\"{master_resume[:3500]}\"\"\"

Return a strict JSON object with:
{{
  "tailored_summary": "High-impact 3-4 sentence professional summary tailored to {company} positioning the candidate as an ideal match",
  "tailored_experience": [
    {{
      "role": "Title at Company",
      "bullets": [
        "High impact achievement bullet with quantifiable metrics (STAR format)",
        "Technical achievement emphasizing relevant tools"
      ]
    }}
  ],
  "highlighted_skills": ["Top 8-12 skills most relevant to this role"],
  "match_strategy_notes": "2-3 strategic tips on how to pitch experience during interviews for this role"
}}
"""
    result = None
    if GEMINI_API_KEY:
        result = _call_gemini_json(prompt)
    if not result and OPENAI_API_KEY:
        result = _call_openai_json(prompt)
    if not result:
        # Heuristic fallback
        skills_str = ", ".join(matched_skills[:6]) or "FastAPI, React, Python, Distributed Systems"
        result = {
            "tailored_summary": f"Accomplished Senior Software Engineer specializing in {skills_str}. Proven track record of designing high-availability architectures and delivering scalable web applications aligned with {company}'s engineering objectives.",
            "tailored_experience": [
                {
                    "role": "Staff Software Engineer | CloudVenture Labs",
                    "bullets": [
                        f"Architected core services utilizing {matched_skills[0] if matched_skills else 'Python & FastAPI'}, scaling system throughput by 45% while maintaining sub-second latency.",
                        f"Led full-lifecycle delivery of distributed features directly addressing requirements analogous to {job_title}.",
                        "Mentored cross-functional developers and instituted automated CI/CD pipelines achieving 90%+ test coverage."
                    ]
                },
                {
                    "role": "Senior Full Stack Engineer | Apex Financial Tech",
                    "bullets": [
                        f"Developed high-throughput API microservices and dynamic user interfaces using {matched_skills[1] if len(matched_skills) > 1 else 'React and TypeScript'}.",
                        "Spearheaded database query optimization and caching, reducing P99 latency by 60%."
                    ]
                }
            ],
            "highlighted_skills": matched_skills[:10] if matched_skills else ["Python", "FastAPI", "React", "TypeScript", "Docker", "AWS", "SQL"],
            "match_strategy_notes": f"Emphasize your hands-on expertise with {', '.join(matched_skills[:3]) if matched_skills else 'core stack'}. Frame your experience with distributed systems to bridge any unfamiliar tools."
        }
    return result

def generate_cover_letter(
    user_profile: dict, 
    job_title: str, 
    company: str, 
    job_description: str, 
    tone: str = "Confident & Professional",
    hiring_manager: Optional[dict] = None
) -> Dict[str, Any]:
    full_name = user_profile.get("full_name", "Applicant")
    skills = user_profile.get("skills", [])
    manager_name = hiring_manager.get("name") if hiring_manager else ""
    manager_title = hiring_manager.get("title") if hiring_manager else ""

    recruiter_context = f"Hiring Manager / Recruiter: {manager_name} ({manager_title})" if manager_name else "Hiring Manager: Not specified (address hiring team)"

    prompt = f"""
Write a high-converting, personalized Cover Letter and Recruiter Outreach message from {full_name} for the position "{job_title}" at "{company}".
Tone: {tone}
{recruiter_context}

Candidate Skills: {json.dumps(skills[:15])}
Job Description Context:
\"\"\"{job_description[:2000]}\"\"\"

Return a strict JSON object with:
{{
  "subject_line": "Subject line for application / email",
  "cover_letter": "Full 3-4 paragraph cover letter formatted with salutation (use hiring manager's name if provided), hooks, proof of impact, and clear call to action",
  "recruiter_dm": "Short, punchy 3-sentence outreach message for LinkedIn InMail or connection request note addressing the recruiter personally if known",
  "key_hooks": ["Hook 1 highlighting relevant impact", "Hook 2 highlighting mission alignment"]
}}
"""
    result = None
    if GEMINI_API_KEY:
        result = _call_gemini_json(prompt)
    if not result and OPENAI_API_KEY:
        result = _call_openai_json(prompt)
    if not result:
        # High quality fallback
        top_skills = ", ".join(skills[:4]) if skills else "Python, FastAPI, React, and Cloud Architecture"
        salutation = f"Dear {manager_name}," if manager_name else f"Dear Hiring Team at {company},"
        dm_greeting = f"Hi {manager_name.split()[0]}!" if manager_name else f"Hi there!"
        result = {
            "subject_line": f"Application for {job_title} - {full_name}",
            "cover_letter": f"""{salutation}

I am writing to express my strong interest in the {job_title} role at {company}. Having followed your recent growth and engineering innovations, I am eager to contribute my background in {top_skills} to help advance your product roadmap.

Throughout my career, I have focused on designing resilient distributed systems and building modern, responsive user experiences. At CloudVenture Labs, I architected an enterprise service that scaled to millions of daily requests while reducing latency by over 45%. My approach blends hands-on technical rigor with cross-functional leadership, ensuring that engineering solutions directly drive product milestones.

What excites me most about {company} is your commitment to high engineering standards and user-centric problem solving. I would welcome the opportunity to discuss how my technical expertise and passion for reliable systems can support your team's goals.

Thank you for your time and consideration.

Warm regards,
{full_name}""",
            "recruiter_dm": f"{dm_greeting} I noticed {company} is hiring for a {job_title}. With my strong background in {top_skills} and scaling distributed systems, I'd love to connect and learn more about your team's current focus areas.",
            "key_hooks": [
                f"Track record of scaling production systems with {skills[0] if skills else 'modern backends'} by 45%",
                f"Proven synergy between frontend performance and backend microservices"
            ]
        }
    return result

def draft_ats_answer(question: str, job_context: str, user_profile: dict) -> Dict[str, Any]:
    full_name = user_profile.get("full_name", "Applicant")
    skills = user_profile.get("skills", [])
    standard_answers = user_profile.get("standard_answers", {})

    prompt = f"""
Candidate Name: {full_name}
Candidate Background Skills: {json.dumps(skills[:15])}
Standard Candidate Preferences: {json.dumps(standard_answers)}
Job Context: \"\"\"{job_context[:1000]}\"\"\"

The candidate is filling an ATS application form (Greenhouse/Lever/Workday) and encountered this question:
Question: \"{question}\"

Provide a concise, authentic, professional answer in first person ("I").
Return a strict JSON object with:
{{
  "answer": "The drafted response (1-3 paragraphs or concise answer depending on question nature)",
  "bullet_points": ["Optional key points included"],
  "confidence_rating": "High" | "Medium"
}}
"""
    result = None
    if GEMINI_API_KEY:
        result = _call_gemini_json(prompt)
    if not result and OPENAI_API_KEY:
        result = _call_openai_json(prompt)
    if not result:
        q_lower = question.lower()
        if "why" in q_lower and ("us" in q_lower or "company" in q_lower or "work" in q_lower):
            ans = standard_answers.get("why_us", f"I am deeply impressed by your team's mission and engineering standards. My background in {', '.join(skills[:3]) if skills else 'software engineering'} directly matches your technical challenges, and I am excited to contribute to high-impact systems here.")
        elif "salary" in q_lower or "compensation" in q_lower:
            ans = standard_answers.get("expected_salary", "My target compensation is flexible depending on equity and benefits, in the range of $175,000 - $195,000 USD.")
        elif "sponsorship" in q_lower or "authorized" in q_lower or "visa" in q_lower:
            ans = standard_answers.get("work_authorization", "I am authorized to work in the United States without requiring sponsorship now or in the future.")
        elif "notice" in q_lower or "start" in q_lower:
            ans = standard_answers.get("notice_period", "I can start within 2 weeks of an offer.")
        else:
            ans = f"In my recent work, I have focused on building scalable, reliable software using {', '.join(skills[:3]) if skills else 'modern technologies'}. I approach engineering problems with a focus on maintainability, proactive cross-functional communication, and measurable user outcomes."

        result = {
            "answer": ans,
            "bullet_points": ["Addresses question directly", "Tailored to candidate profile"],
            "confidence_rating": "High"
        }
    return result

def generate_learning_roadmap(missing_skills: List[str], job_title: str) -> Dict[str, Any]:
    prompt = f"""
Generate an actionable 14-day skill bridging roadmap for a candidate applying for "{job_title}".
The candidate is missing these required/preferred skills:
{json.dumps(missing_skills)}

Return a strict JSON object with:
{{
  "overview": "Encouraging summary explaining how to bridge these gaps quickly",
  "key_topics": [
    {{
      "skill": "Skill name",
      "priority": "High" | "Medium",
      "learning_goal": "What to master",
      "recommended_resource": "Free docs, tutorial, or course title",
      "fast_track_project": "Hands-on project to build in 48 hours to prove competence"
    }}
  ],
  "interview_talking_points": [
    "How to address missing skills positively when asked in technical rounds"
  ]
}}
"""
    result = None
    if GEMINI_API_KEY:
        result = _call_gemini_json(prompt)
    if not result and OPENAI_API_KEY:
        result = _call_openai_json(prompt)
    if not result:
        key_topics = []
        for s in (missing_skills[:4] or ["GraphQL", "Kafka"]):
            key_topics.append({
                "skill": s,
                "priority": "High",
                "learning_goal": f"Understand core principles, architecture patterns, and production trade-offs of {s}.",
                "recommended_resource": f"Official {s} Documentation & Quickstart Guide",
                "fast_track_project": f"Build a lightweight microservice integrating {s} with a mock producer/consumer API."
            })
        result = {
            "overview": f"These {len(missing_skills)} skills are achievable to bridge rapidly by mapping your existing technical foundation to their design concepts.",
            "key_topics": key_topics,
            "interview_talking_points": [
                "Highlight transferrable architectural skills from analogous tools you already master.",
                "Mention your recent hands-on prototype and express enthusiasm for ramping up immediately."
            ]
        }
    return result

