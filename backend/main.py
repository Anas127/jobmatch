from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import json
import time
from dotenv import load_dotenv
import pdfplumber
import docx

load_dotenv()

request_history = {}
RATE_LIMIT_COUNT = 5
RATE_LIMIT_WINDOW = 3600

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jobmatch-fjik.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobRequest(BaseModel):
    job_description: str
    cv: str = ""


class OutputRequest(BaseModel):
    job_description: str
    cv: str = ""


def check_rate_limit(user_ip: str):
    now = time.time()
    if user_ip not in request_history:
        request_history[user_ip] = []
    request_history[user_ip] = [
        t for t in request_history[user_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(request_history[user_ip]) >= RATE_LIMIT_COUNT:
        raise HTTPException(
            status_code=429, detail="Rate limit exceeded. Try again in an hour.")
    request_history[user_ip].append(now)


@app.get("/")
async def root():
    return {"status": "alive", "message": "JobMatch Backend is awake"}


@app.post("/extract")
async def extract_skills(request: JobRequest, raw_request: Request):
    check_rate_limit(raw_request.client.host)

    prompt = f"""You are a senior technical recruiter and staff engineer reviewing a candidate for rejection or advancement. Be specific, technical, and always name exact technologies — never be generic.

Job Description:
{request.job_description[:3000]}

Candidate CV:
{request.cv[:3000]}

Rules:
- Base every judgment strictly on the content above.
- free_critique is about the CV presentation itself (formatting, positioning, first impression). explanation is about the technical interview specifically. They must not overlap.
- score_breakdown sub-scores must add up to exactly the total score.
- matched_skills must only include technologies explicitly present in both the JD and the CV.
- Return valid JSON only, no extra text.

{{
  "score": <integer 0-100>,
  "level": "<Junior|Mid|Senior|Staff>",
  "free_critique": "<one brutal sentence about the CV presentation itself — formatting, positioning, or first impression>",
  "missing_skills": ["<exact technology or concept name missing from CV but required by JD>"],
  "matched_skills": ["<exact technology present in both the JD requirements and the CV>"],
  "explanation": "<two sentences: why this candidate specifically fails the technical interview for this role>",
  "ats_verdict": {{
    "passes": <true|false>,
    "reason": "<one sentence: the specific reason this CV passes or fails ATS filtering for this role>"
  }},
  "score_breakdown": {{
    "keywords": <0-25>,
    "experience": <0-25>,
    "technical_skills": <0-30>,
    "project_relevance": <0-20>
  }},
  "cv_enhancement": {{
    "rewrite_bullet": "<rewrite the weakest or most relevant bullet from their CV to be metric-driven and ATS-optimized for this role>",
    "hidden_keywords": ["<exact ATS keyword from the JD that is missing from the CV>"]
  }},
  "interview_prep": {{
    "killer_question": "<the hardest question this company will ask that directly targets the candidate's identified gap>",
    "winning_answer": "<a senior-level answer with specific technical detail that would impress the interviewer>",
    "trap_to_avoid": "<the exact phrase or approach this candidate would likely say that would immediately disqualify them>"
  }},
  "priority_roadmap": [
    "<Day 1: specific thing to build or read tonight to close the biggest gap>",
    "<Day 2-3: specific project or concept that proves competency in the missing area>",
    "<Week 1: what to add to GitHub or CV to make the next application stronger>"
  ],
  "projected_score": {{
    "score": <integer 0-100>,
    "condition": "<what specifically needs to change to reach this score>"
  }},
  "rejection_reasons": ["<specific technical mismatch>", "<specific CV weakness>"]
}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    ai_data = json.loads(response.choices[0].message.content)

    return {
        "result": ai_data,
        "job_text": request.job_description,
        "cv_text": request.cv,
    }


@app.post("/generate-outputs")
async def generate_outputs(request: OutputRequest, raw_request: Request):
    check_rate_limit(raw_request.client.host)

    prompt = f"""You are a professional career coach and copywriter. Generate tailored job application content based on this candidate's CV and the target role. Be specific — never use generic phrases.

Job Description:
{request.job_description[:3000]}

Candidate CV:
{request.cv[:3000]}

Return valid JSON only.

{{
  "cover_letter": "<3 paragraphs. Para 1: open with a specific hook about the company's product or technical challenge — never start with 'As a' or 'I am writing' or 'I am excited'. Para 2: 2-3 concrete achievements from their CV most relevant to the JD with metrics where available. Para 3: confident close with a specific value proposition for this company. If no company name is found in the JD, refer to 'your team' — never use '[Company Name]' placeholder.>",
  "cold_email": "<a LinkedIn cold message to the hiring manager. Under 60 words. Sentence 1: one specific observation about the company's product or technical challenge. Sentence 2: one concrete achievement from their CV relevant to the role. Sentence 3: soft CTA asking for a 15-minute call. Never use '[Company Name]' — use 'your team' if no name is found.>",
  "linkedin_headline": "<punchy LinkedIn headline optimized for this type of role. Under 15 words. Include their strongest skill and target role type.>",
  "linkedin_summary": "<3-sentence LinkedIn About section. Positions them for this type of role, highlights their strongest achievements with specifics, ends with what they are looking for.>"
}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.4,
    )

    return json.loads(response.choices[0].message.content)


@app.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    text = ""
    if file.filename.endswith(".pdf"):
        with pdfplumber.open(file.file) as pdf:
            text = "".join(p.extract_text() or "" for p in pdf.pages)
    elif file.filename.endswith(".docx"):
        doc = docx.Document(file.file)
        text = "\n".join(p.text for p in doc.paragraphs)
    else:
        text = (await file.read()).decode("utf-8")
    return {"text": text}
