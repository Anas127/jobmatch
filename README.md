# jobmatch.

AI-powered job application assistant. Paste a job description and your CV — get a match score, ATS verdict, missing skills, CV rewrite, interview prep, cover letter, and cold outreach email in seconds.

**Live demo:** [jobmatch-fjik.vercel.app](https://jobmatch-fjik.vercel.app)

---

## What it does

- **Match Score** — rates your CV against the job description (0–100) with a breakdown across keywords, experience, technical skills, and project relevance
- **ATS Verdict** — tells you if your CV would pass automated filtering and why
- **Skills Gap** — shows what you have vs. what's missing, by exact technology name
- **CV Enhancement** — rewrites your weakest bullet point to be metric-driven and ATS-optimized for the role
- **Interview Cheat Sheet** — the hardest question they'll ask, a senior-level answer, and the phrase that would get you immediately rejected
- **Priority Roadmap** — 3 actionable steps across Day 1, Day 2–3, and Week 1 to close your gaps
- **Cover Letter** — tailored 3-paragraph letter based on your actual CV achievements
- **Cold Outreach** — a 60-word LinkedIn message to the hiring manager
- **LinkedIn Rewrite** — optimized headline and About section for the target role

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Tailwind CSS |
| Backend | FastAPI, Python |
| AI | OpenAI GPT-4o-mini |
| CV Parsing | pdfplumber, python-docx |
| Deployment | Vercel (frontend), Render (backend) |

---

## Running locally

**Backend**

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:
```
OPENAI_API_KEY=your_key_here
```

```bash
uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm start
```

The frontend expects the backend at `https://jobmatch-7zo9.onrender.com`. To point it at your local backend, change `API_URL` in `src/App.js` to `http://localhost:8000`.

---

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/extract` | POST | Analyze CV against job description |
| `/generate-outputs` | POST | Generate cover letter, cold email, LinkedIn rewrite |
| `/upload-cv` | POST | Parse PDF or DOCX into plain text |

Rate limited to 5 requests per IP per hour.
