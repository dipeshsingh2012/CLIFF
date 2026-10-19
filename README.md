# CLIFF (Career Intelligence & Job Framework)

> **Private, local-first Career Intelligence and Job Tracking System that acts as an upgraded, independent alternative to native platform features like LinkedIn AI.**

CLIFF bridges the gap between job discovery and job application by combining:
1. **FastAPI Backend (Port 8000)**: Local SQLite storage, AI intelligence parser, resume tailoring, cover letter generator, and ATS drafting engine.
2. **React Dashboard (Port 5173)**: High-performance Kanban pipeline, side-by-side skill gap breakdown (Matched vs. Missing skills), and per-job AI Studio.
3. **Manifest V3 Chrome Extension**: One-click LinkedIn job scraper, ATS form-autofiller (Greenhouse, Lever, Workday, Ashby), inline AI textarea answer drafter, and background Workday session sync.

> 📋 **Engineering Roadmap & Master Tracker**: See [MASTER_TRACKER.md](file:///home/dipes/projects/CLIFF/MASTER_TRACKER.md) for decision logs, multi-phase roadmap, and task status.

---

## 🏛 Architecture & Project Structure

```
CLIFF/
├── backend/
│   ├── main.py              # FastAPI endpoints, CORS, job ingestion, lifecycle
│   ├── models.py            # SQLModel database schemas (UserProfile, Job, JobIntelligence)
│   ├── database.py          # SQLite engine, session factory, default profile seeder
│   ├── ai_engine.py         # Multi-provider LLM engine (Gemini, OpenAI, Heuristic fallback)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Optional API keys for live Gemini or OpenAI
├── frontend/
│   ├── src/
│   │   ├── api.js           # Centralized API service
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Nav, quick metrics, API health indicator
│   │   │   ├── KanbanBoard.jsx      # Visual 5-column pipeline with match score filter
│   │   │   ├── JobDetailModal.jsx   # Side-by-side JD & skill gap breakdown
│   │   │   ├── StudioView.jsx       # Resume tailoring, cover letters, learning roadmap
│   │   │   ├── ProfileManager.jsx   # Master resume, skills matrix, standard ATS answers
│   │   │   └── AddJobModal.jsx      # Manual ingestion with pre-fill sample JD
│   │   ├── App.jsx          # Root view coordinator
│   │   └── index.css        # Tailwind CSS dark theme styling
│   ├── tailwind.config.js
│   └── package.json
└── extension/
    ├── manifest.json        # Chrome Manifest V3 configuration
    ├── background.js        # Service worker for periodic alarms and Workday tab sync
    ├── content-scraper.js   # LinkedIn one-click scraper + floating badge injector
    ├── content-autofill.js  # ATS form mapper + inline "⚡ Draft Answer with CLIFF"
    ├── content-workday.js   # Workday candidate portal DOM status extractor
    ├── popup.html           # Modern dark extension popup interface
    ├── popup.js             # Extension popup actions controller
    └── icons/               # 16px, 48px, 128px PNG icons
```

---

## 🚀 Quick Start Guide

### 1. Launch All Services (One Command)

From the root directory, simply run:
```bash
./run.sh
```

Or run services individually:

#### Start Backend:
```bash
cd backend
# Create virtual environment if needed
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/uvicorn main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

#### Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Dashboard: `http://localhost:5173`

---

## 🧩 Loading the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** via the toggle switch in the top right corner.
3. Click **Load unpacked** in the top left corner.
4. Select the `extension/` directory inside this repository (`/home/dipes/projects/CLIFF/extension`).
5. Pin the CLIFF extension icon to your toolbar.

---

## ⚡ End-to-End Capabilities

### 1. One-Click Ingestion & Instant AI Analysis
- When viewing a job description on **LinkedIn**, a floating **⚡ Save to CLIFF** badge appears automatically.
- Alternatively, click the extension icon to view page detection and click **Ingest Job to CLIFF**.
- The backend automatically:
  - Extracts hard technologies, soft skills, seniority level, and core duties.
  - Compares required skills against your **Master Profile**.
  - Calculates an objective **Match Score (0-100%)** and partitions skills into **Matched** vs. **Missing** skills.

### 2. Interactive Kanban Pipeline & Detail Inspector
- View jobs organized by status: `Saved`, `Applied`, `Interviewing`, `Offer`, `Rejected`.
- Filter in real time by title/company keyword or set a minimum match score slider (e.g. 75%+).
- Click any card to inspect the original job posting side-by-side with the AI-extracted requirements, role responsibilities, and application notes.

### 3. AI Intelligence Studio
- **Resume Tailoring**: Generates an executive summary tailored to the employer, STAR-format achievement bullets highlighting matched competencies, and interview pitch advice.
- **Cover Letter & Cold DM Generator**: Select your tone persona (*Confident & Professional*, *Enthusiastic*, or *Executive*). Generates a complete application letter plus a 3-sentence recruiter outreach message for LinkedIn InMail.
- **14-Day Skill Bridging Roadmap**: For jobs with missing skills, generates concrete learning goals, free documentation links, 48-hour hands-on micro-projects, and tips on how to address skill gaps in interviews.

### 4. ATS Form Autofill & Inline AI Drafter
- On ATS candidate application forms (**Greenhouse**, **Lever**, **Workday**, **Ashby**), the extension injects a top action bar to autofill standard applicant details from your master profile.
- Beside open-ended text areas, an inline **⚡ Draft Answer with CLIFF AI** button appears to synthesize tailored answers on the fly.

### 5. Background Workday Session Sync
- The extension runs a background service worker with `chrome.alarms` every 15 minutes.
- Queries `GET /api/jobs/active-urls` from FastAPI and silently inspects active Workday tabs using your authenticated browser cookies.
- When an application status change is detected (e.g. `Applied` $\rightarrow$ `Interviewing`), it immediately updates the status in FastAPI via `PUT /api/jobs/{id}/status`.

---

## 🔑 AI Engine Configuration (Optional)

CLIFF features a built-in **deterministic & heuristic NLP engine** that works 100% out of the box with zero external API keys.

To enable live LLM synthesis via Google Gemini or OpenAI:
1. Edit `backend/.env`:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   # OR
   OPENAI_API_KEY=your_openai_api_key_here
   ```
2. Restart the backend. CLIFF will automatically use Gemini or OpenAI for all extraction, tailoring, and drafting requests.

