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

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "cliff-512020")
GCP_REGION = os.getenv("GCP_REGION", "us-central1")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
USE_VERTEX_AI = os.getenv("USE_VERTEX_AI", "true").lower() in ("true", "1", "yes")

_client = None

def get_genai_client():
    """
    Returns an authenticated Google GenAI client.
    Priority 1: Native Vertex AI with Application Default Credentials (IAM / Keyless)
    Priority 2: Gemini Developer API Key (if provided in environment)
    """
    global _client
    if _client is not None:
        return _client

    from google import genai

    if USE_VERTEX_AI and GCP_PROJECT_ID:
        try:
            logger.info(f"[AI Engine] Initializing Vertex AI Gemini client (project={GCP_PROJECT_ID}, location={GCP_REGION})")
            _client = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location=GCP_REGION)
            return _client
        except Exception as e:
            logger.warning(f"[AI Engine] Vertex AI initialization failed: {e}")

    if GEMINI_API_KEY:
        try:
            logger.info("[AI Engine] Initializing Gemini API Key client")
            _client = genai.Client(api_key=GEMINI_API_KEY)
            return _client
        except Exception as e:
            logger.warning(f"[AI Engine] Gemini API Key initialization failed: {e}")

    return None

def _safe_parse_json(raw_text: str) -> Optional[dict]:
    """
    Resiliently parse JSON emitted by LLMs.
    Handles markdown fences, trailing commas, and newline-separated properties missing commas.
    """
    if not raw_text or not raw_text.strip():
        return None
    text = raw_text.strip()

    # 1. Strip markdown fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text).strip()

    # 2. Direct parse attempt
    try:
        return json.loads(text)
    except Exception:
        pass

    # 3. Extract outermost JSON structure
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if match:
        candidate = match.group(1).strip()
        try:
            return json.loads(candidate)
        except Exception:
            pass

        # 4. Strip trailing commas before closing braces/brackets
        no_trailing = re.sub(r",\s*([\]}])", r"\1", candidate)
        try:
            return json.loads(no_trailing)
        except Exception:
            pass

        # 5. Repair missing commas between newline-delimited properties or array elements
        repaired = re.sub(r"([0-9]|true|false|null|\"|\]|\})\s*\n\s*(\"|\{|\[)", r"\1,\n\2", no_trailing)
        try:
            return json.loads(repaired)
        except Exception:
            pass

    return None

def _call_gemini_json(prompt: str, system_instruction: str = "") -> Optional[dict]:
    client = get_genai_client()
    if not client:
        return None
    try:
        from google.genai import types
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_instruction or "You are CLIFF, an expert career intelligence and job matching AI. Return valid, well-formed JSON only with proper commas.",
                temperature=0.2
            )
        )
        if response.text:
            parsed = _safe_parse_json(response.text)
            if parsed is not None:
                return parsed
            logger.warning(f"[AI Engine] Could not safely parse Gemini JSON response. Snippet: {response.text[:200]}")
    except Exception as e:
        logger.warning(f"Vertex AI Gemini call failed, falling back: {e}")
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
            parsed = _safe_parse_json(content)
            if parsed is not None:
                return parsed
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

def generate_learning_roadmap(
    missing_skills: List[str],
    job_title: str,
    company: Optional[str] = "",
    raw_description: Optional[str] = ""
) -> Dict[str, Any]:
    company_context = f' at "{company}"' if company else ''
    jd_snippet = f"\nRelevant Job Description & Requirements:\n\"\"\"{raw_description[:2000]}\"\"\"\n" if raw_description else ""

    prompt = f"""
You are CLIFF, an expert technical mentor and career strategist.
Generate an actionable 14-day skill bridging roadmap for a candidate applying for "{job_title}"{company_context}.
{jd_snippet}
The candidate needs to bridge these identified skill gaps:
{json.dumps(missing_skills)}

Return a strict JSON object with this exact structure:
{{
  "overview": "Encouraging, concrete summary explaining how to bridge these specific skill gaps quickly to stand out for {job_title}{company_context}",
  "key_topics": [
    {{
      "skill": "Skill name",
      "priority": "High" | "Medium",
      "learning_goal": "Precise concept or architectural pattern to master for this role",
      "recommended_resource": "Authoritative free documentation, official tutorial, or key industry specification",
      "fast_track_project": "Targeted proof-of-concept project the candidate can build in 48 hours to demonstrate production competence"
    }}
  ],
  "interview_talking_points": [
    "Concrete talking point addressing how to frame this skill during interviews and connect it to past experience"
  ]
}}
"""
    result = _call_gemini_json(prompt)
    if not result and OPENAI_API_KEY:
        result = _call_openai_json(prompt)
    if not result:
        key_topics = []
        for s in (missing_skills[:5] or ["System Design", "Cloud Infrastructure"]):
            key_topics.append({
                "skill": s,
                "priority": "High",
                "learning_goal": f"Understand core principles, architecture patterns, and production trade-offs of {s} for {job_title}.",
                "recommended_resource": f"Official {s} Documentation & Quickstart Guide",
                "fast_track_project": f"Build a lightweight prototype integrating {s} aligned with {job_title} requirements."
            })
        result = {
            "overview": f"These {len(missing_skills)} skills are achievable to bridge rapidly by mapping your existing technical foundation to their design concepts.",
            "key_topics": key_topics,
            "interview_talking_points": [
                f"Highlight transferrable architectural skills from analogous tools you already master when discussing {missing_skills[0] if missing_skills else 'new technologies'}.",
                "Mention your recent hands-on prototype and express enthusiasm for ramping up immediately."
            ]
        }
    return result

def generate_job_learning_module(
    skill_gap: str,
    job_title: str = "Software Engineer",
    company: str = "Target Company",
    company_industry: str = "",
    company_size: str = "",
    seniority_level: str = "",
    raw_description: str = ""
) -> Dict[str, Any]:
    # Determine difficulty level from seniority_level and job_title
    lower_title = (job_title or "").lower()
    lower_sen = (seniority_level or "").lower()
    if any(k in lower_sen or k in lower_title for k in ["staff", "principal", "director", "architect"]):
        difficulty = "Staff / Principal"
    elif any(k in lower_sen or k in lower_title for k in ["senior", "lead"]):
        difficulty = "Senior"
    elif any(k in lower_sen or k in lower_title for k in ["junior", "entry", "associate", "intern"]):
        difficulty = "Foundational"
    else:
        difficulty = "Mid-Senior"

    comp_name = company or "the target organization"
    industry_str = f" in the {company_industry} sector" if company_industry else ""
    size_str = f" (scale: {company_size})" if company_size else ""
    company_full_ctx = f"{comp_name}{industry_str}{size_str}"

    jd_snippet = f"\nTarget Job Context snippet:\n\"\"\"{raw_description[:1500]}\"\"\"\n" if raw_description else ""

    prompt = f"""
You are CLIFF Academy's Master Technical Curriculum Designer.
Design an advanced, job-anchored theoretical learning module and scenario-based evaluation quiz for:
- Target Skill to Bridge: "{skill_gap}"
- Role: "{job_title}" (Seniority / Difficulty: {difficulty})
- Target Organization: "{company_full_ctx}"
{jd_snippet}

CRITICAL REQUIREMENTS:
1. STRICTLY NO hands-on coding exercises, PoC setups, or "hello world" code snippets.
2. The entire briefing MUST be high-level theoretical, conceptual, and architectural. Anchor all theoretical trade-offs directly to {comp_name}'s domain, scale, and operational reality.
3. Provide a deep scenario-based quiz with exactly 3 practical situational dilemmas testing system design, operational judgment, and trade-off analysis.

Return a strict JSON object with this exact structure:
{{
  "module_title": "Comprehensive title (e.g. 'Production {skill_gap}: Architecture, Scale, and Resilience at {comp_name}')",
  "difficulty_level": "{difficulty}",
  "company_context_summary": "2-3 concise sentences detailing why {skill_gap} is strategically vital for {comp_name} given its industry and scale.",
  "reading_markdown": "Markdown string containing:
    ## 1. Architectural & Theoretical Foundations
    Explain core conceptual mental models, consistency guarantees, data structures, and protocol mechanics.

    ## 2. Real-World Application at {comp_name}
    Analyze how this technology operates at the scale of {company_size or 'enterprise workloads'} within {company_industry or 'modern tech'}. Address latency, compliance, or reliability constraints.

    ## 3. High-Stakes Production Traps & Failure Modes
    Detail subtle edge cases, thundering herds, split-brain, memory leaks, or cascading failures that senior candidates must anticipate.

    ## 4. Executive Interview Framing
    How to articulate mastery of {skill_gap} and its production trade-offs in technical interviews with hiring leaders.",
  "quiz_questions": [
    {{
      "id": 1,
      "scenario": "Detailed situational scenario reflecting real-world conditions at {comp_name}...",
      "question": "What is the most sound architectural or operational decision to resolve this dilemma?",
      "options": [
        "First plausible option",
        "Second plausible option",
        "Third plausible option",
        "Fourth plausible option"
      ],
      "correct_index": 0,
      "explanation": "In-depth rationale explaining why this choice is theoretically and operationally sound, and why the alternatives fail under production load."
    }},
    {{
      "id": 2,
      "scenario": "Another realistic failure mode or scaling challenge at {comp_name}...",
      "question": "Which design pattern or configuration best mitigates this risk?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 1,
      "explanation": "Rigorous explanation of the underlying system mechanics."
    }},
    {{
      "id": 3,
      "scenario": "A third dilemma focusing on trade-offs between latency, throughput, consistency, and operational complexity...",
      "question": "What trade-off best satisfies the service level objectives (SLOs)?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 2,
      "explanation": "Clear architectural evaluation of the trade-off matrix."
    }}
  ]
}}
"""
    result = _call_gemini_json(prompt, system_instruction="You are CLIFF Academy's principal curriculum architect. Produce deep, rigorous, context-anchored theoretical learning modules and scenario quizzes.")
    if not result and OPENAI_API_KEY:
        result = _call_openai_json(prompt, system_instruction="You are CLIFF Academy's principal curriculum architect. Produce deep, rigorous, context-anchored theoretical learning modules and scenario quizzes.")
    if not result:
        # High quality deterministic fallback
        reading_md = f"""# {skill_gap} at Scale: Architectural Principles for {comp_name}

## 1. Architectural & Theoretical Foundations
At its core, **{skill_gap}** provides foundational guarantees around modularity, distributed execution, and fault tolerance. In modern distributed systems, mastering {skill_gap} requires shifting mental models from isolated local execution to asynchronous, partition-tolerant topologies.
- **State Coordination & Consistency**: Understanding how state is propagated across nodes without violating CAP constraints.
- **Resource Isolation & Backpressure**: Preventing noisy neighbors and resource starvation across shared clusters.
- **Decoupled Abstractions**: Separating control plane orchestration from data plane throughput.

## 2. Real-World Application at {comp_name}
For an organization in the **{company_industry or 'technology'}** sector operating at the scale of **{company_size or 'rapidly growing teams'}**, {skill_gap} is not just an implementation detail—it dictates time-to-market and operational resilience.
- **Domain Constraints**: Balancing strict auditability and high-availability against system complexity.
- **Scale Dynamics**: Ensuring that spikes in traffic or concurrent workflows degrade gracefully through circuit breaking and rate limiting rather than cascading failure.

## 3. High-Stakes Production Traps & Failure Modes
Senior engineers are distinguished not by knowing syntax, but by avoiding known failure modes:
1. **The Thundering Herd**: Inadvertent synchronization of retry policies causing downstream service exhaustion.
2. **Hidden State Leakage**: Accumulation of uncollected metadata or stale cache invalidations under sustained load.
3. **Split-Brain Scenarios**: Network partitions where multiple instances attempt conflicting state mutations.

## 4. Executive Interview Framing
When discussing {skill_gap} with hiring managers and staff engineers at {comp_name}:
- Anchor your explanations in **trade-offs** (e.g., consistency vs. latency, operational overhead vs. developer velocity).
- Articulate the lifecycle of a production outage you prevented or remediated using these exact principles.
"""
        quiz = [
            {
                "id": 1,
                "scenario": f"At {comp_name}, a critical downstream service experiences intermittent 504 gateway timeouts under peak load. Teams observe that multiple client workers are repeatedly retrying failed requests simultaneously.",
                "question": "Which theoretical resilience pattern best mitigates this failure without overwhelming the downstream service?",
                "options": [
                    "Implement exponential backoff with full randomized jitter and an adaptive circuit breaker.",
                    "Double the retry limit and decrease the connection timeout window.",
                    "Switch all synchronous requests to unbounded in-memory queues without backpressure.",
                    "Restart the client worker cluster every 15 minutes via automated cron jobs."
                ],
                "correct_index": 0,
                "explanation": "Exponential backoff with full jitter de-synchronizes retry spikes, preventing thundering herd problems, while circuit breakers immediately stop doomed requests from consuming thread pools."
            },
            {
                "id": 2,
                "scenario": f"Given {comp_name}'s scale ({company_size or 'enterprise'}), a data pipeline utilizing {skill_gap} must guarantee strict message ordering per customer while maintaining high aggregate throughput across millions of tenants.",
                "question": "Which architectural strategy best satisfies both strict per-customer ordering and horizontally scalable throughput?",
                "options": [
                    "Enforce a single global sequential partition for all tenants across the cluster.",
                    "Partition events using the unique customer ID as the partition key, allowing parallel processing across multiple independent consumer partitions.",
                    "Disable acknowledgements to maximize write throughput.",
                    "Store all events in a single unindexed database table and query sequentially."
                ],
                "correct_index": 1,
                "explanation": "Partitioning by customer key guarantees that events for any single customer land on the same partition and are processed sequentially, while distinct customers are distributed evenly across partitions for maximum parallelism."
            },
            {
                "id": 3,
                "scenario": f"During architectural review for a {job_title} role at {comp_name}, an interviewer asks how to defend against silent data corruption during high-throughput network partitions.",
                "question": "What is the primary design trade-off according to the PACELC theorem?",
                "options": [
                    "Under partition (P), choose between Availability (A) and Consistency (C); Else (E), choose between Latency (L) and Consistency (C).",
                    "A distributed system can always provide both total availability and zero latency under all network conditions.",
                    "Strong consistency removes the need for replication across failure zones.",
                    "Eventual consistency eliminates network latency completely."
                ],
                "correct_index": 0,
                "explanation": "The PACELC theorem extends CAP: during a network partition one must trade availability for consistency, and in normal operations one must trade latency for consistency to synchronize state."
            }
        ]

        result = {
            "module_title": f"Production {skill_gap}: Architecture, Scale & Resilience at {comp_name}",
            "difficulty_level": difficulty,
            "company_context_summary": f"{skill_gap} is critical for {comp_name} to guarantee high availability, strict domain compliance, and seamless operational scalability across {company_size or 'distributed systems'}.",
            "reading_markdown": reading_md,
            "quiz_questions": quiz
        }

    return result


def _heuristic_resume_parse(resume_text: str) -> Dict[str, Any]:
    text = resume_text.strip()
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    # 1. Contact Info
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else ""

    phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else ""

    linkedin_match = re.search(r'(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-]+', text, re.IGNORECASE)
    linkedin_url = linkedin_match.group(0) if linkedin_match else ""
    if linkedin_url and not linkedin_url.startswith("http"):
        linkedin_url = "https://" + linkedin_url

    github_match = re.search(r'(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-]+', text, re.IGNORECASE)
    github_url = github_match.group(0) if github_match else ""
    if github_url and not github_url.startswith("http"):
        github_url = "https://" + github_url

    portfolio_match = re.search(r'(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9\-]+\.(?:dev|io|me|app|com)(?:\/[^\s]*)?', text, re.IGNORECASE)
    portfolio_url = ""
    if portfolio_match:
        cand = portfolio_match.group(0)
        if "linkedin" not in cand and "github" not in cand:
            portfolio_url = cand if cand.startswith("http") else "https://" + cand

    # Candidate Name: inspect first 3 non-empty lines
    full_name = "Candidate"
    for line in lines[:3]:
        if "@" not in line and "linkedin" not in line.lower() and "github" not in line.lower() and len(line.split()) in [2, 3, 4] and len(line) < 40:
            full_name = line.strip()
            break

    # 2. Extract Skills
    text_lower = text.lower()
    found_skills = []
    for skill in COMMON_HARD_SKILLS + COMMON_SOFT_SKILLS:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill)

    # 3. Modular Experience Blocks (Heuristic)
    experience_blocks = []
    current_block = None
    bullet_regex = re.compile(r'^[\u2022\u25E6\u2043\u2219\*\-\–\—\•]\s*(.+)$')
    date_regex = re.compile(r'\b(20\d{2}|19\d{2})\b|\b(present|current)\b', re.IGNORECASE)

    for line in lines:
        bullet_match = bullet_regex.match(line)
        if bullet_match:
            bullet_text = bullet_match.group(1).strip()
            if current_block:
                current_block["bullets"].append(bullet_text)
                for s in found_skills:
                    if s.lower() in bullet_text.lower() and s not in current_block["skills_used"]:
                        current_block["skills_used"].append(s)
            continue

        # Check if line looks like a role/company heading with dates
        if date_regex.search(line) and ("|" in line or "–" in line or "-" in line or "," in line) and len(line) < 120:
            if current_block and current_block["bullets"]:
                experience_blocks.append(current_block)
            
            parts = [p.strip() for p in re.split(r'[\|\–\—]', line)]
            role = parts[0] if len(parts) > 0 else "Software Engineer"
            company = parts[1] if len(parts) > 1 else "Tech Company"

            current_block = {
                "company": company,
                "role": role,
                "location": "Remote / On-site",
                "start_date": "2021",
                "end_date": "Present",
                "skills_used": [],
                "bullets": []
            }

    if current_block and current_block["bullets"]:
        experience_blocks.append(current_block)

    # Fallback experience block if none structured
    if not experience_blocks:
        experience_blocks = [
            {
                "company": "Technology Solutions",
                "role": "Senior Software Engineer",
                "location": "Remote",
                "start_date": "2021",
                "end_date": "Present",
                "skills_used": found_skills[:5],
                "bullets": [
                    f"Architected scalable web applications and microservices using {', '.join(found_skills[:3]) if found_skills else 'modern cloud stack'}.",
                    "Engineered resilient backend APIs and automated CI/CD deployment pipelines."
                ]
            }
        ]

    # Summary
    first_paragraph = ""
    for line in lines[1:6]:
        if len(line) > 50 and not bullet_regex.match(line) and "@" not in line:
            first_paragraph = line
            break
    summary = first_paragraph or f"Accomplished software engineer with deep expertise in {', '.join(found_skills[:4]) if found_skills else 'software architecture and modern stacks'}."

    return {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "location": "San Francisco, CA",
        "linkedin_url": linkedin_url,
        "github_url": github_url,
        "portfolio_url": portfolio_url,
        "professional_summary": summary,
        "skills": sorted(list(set(found_skills))) if found_skills else ["Python", "FastAPI", "React", "TypeScript", "Docker"],
        "experience_blocks": experience_blocks,
        "education": [
            {
                "degree": "B.S. in Computer Science or Equivalent",
                "institution": "Accredited University",
                "year": "2020"
            }
        ],
        "standard_answers": {
            "work_authorization": "Authorized to work without requiring sponsorship now or in the future.",
            "notice_period": "Available within 2 weeks of offer acceptance.",
            "expected_salary": "Target compensation is flexible depending on equity, benefits, and total scope.",
            "why_us": "Excited to bring hands-on architectural experience to scale core platform systems and drive measurable user impact."
        }
    }

def parse_resume_to_structured_profile(resume_text: str) -> Dict[str, Any]:
    prompt = f"""
You are an expert Executive Resume Parser and ATS Specialist.
Decompose the following resume plain text into a structured, high-accuracy JSON candidate profile.

Resume Text:
\"\"\"{resume_text[:6500]}\"\"\"

Return a strict JSON object with this exact structure:
{{
  "full_name": "Candidate's full legal name",
  "email": "Email address or empty string",
  "phone": "Phone number or empty string",
  "location": "City, State or City, Country or empty string",
  "linkedin_url": "Full LinkedIn URL or empty string",
  "github_url": "Full GitHub URL or empty string",
  "portfolio_url": "Personal website or portfolio URL or empty string",
  "professional_summary": "1-3 sentence impactful summary of candidate experience and technical focus",
  "skills": ["Extensive list of all hard technical skills, languages, frameworks, cloud tools, databases, libraries, and soft leadership skills extracted from the resume"],
  "experience_blocks": [
    {{
      "company": "Company Name",
      "role": "Job Title",
      "location": "Location or Remote",
      "start_date": "e.g. 2021 or Jan 2021",
      "end_date": "e.g. Present or Dec 2023",
      "skills_used": ["Skills applied specifically in this role"],
      "bullets": [
        "Action bullet describing technical achievement and quantifiable metric",
        "System architecture or product delivery bullet"
      ]
    }}
  ],
  "education": [
    {{
      "degree": "Degree and Field of Study",
      "institution": "University / College Name",
      "year": "Graduation year or date range"
    }}
  ],
  "standard_answers": {{
    "work_authorization": "Statement regarding work authorization status if indicated, otherwise 'Authorized to work without sponsorship.'",
    "notice_period": "Notice period if mentioned, otherwise 'Available within 2 weeks of offer.'",
    "expected_salary": "Salary expectations if mentioned, otherwise 'Competitive / Open to discussion'",
    "why_us": "Compelling candidate value pitch highlighting core expertise"
  }}
}}
"""
    result = _call_gemini_json(prompt, system_instruction="You are an expert ATS resume parsing engine. Decompose the resume into clean, structured JSON.")
    if not result and OPENAI_API_KEY:
        result = _call_openai_json(prompt, system_instruction="You are an expert ATS resume parsing engine. Decompose the resume into clean, structured JSON.")
    if not result:
        result = _heuristic_resume_parse(resume_text)

    # Sanity checks on result
    if not result.get("skills"):
        heuristic = _heuristic_resume_parse(resume_text)
        result["skills"] = heuristic["skills"]
    if not result.get("experience_blocks"):
        heuristic = _heuristic_resume_parse(resume_text)
        result["experience_blocks"] = heuristic["experience_blocks"]

    return result

