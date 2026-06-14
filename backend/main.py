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
    allow_origins=["https://jobmatch-fjik.vercel.app",
                   "http://localhost:3000",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobRequest(BaseModel):
    job_description: str
    cv: str = ""


@app.get("/")
async def root():
    return {"status": "alive", "message": "JobMatch Backend is awake"}


@app.post("/extract")
async def extract_skills(request: JobRequest, raw_request: Request):
    user_ip = raw_request.client.host
    now = time.time()

    if user_ip not in request_history:
        request_history[user_ip] = []

    request_history[user_ip] = [
        t for t in request_history[user_ip] if now - t < RATE_LIMIT_WINDOW]

    if len(request_history[user_ip]) >= RATE_LIMIT_COUNT:
        raise HTTPException(
            status_code=429, detail="Rate limit exceeded. Try again in an hour.")

    request_history[user_ip].append(now)

    prompt = f"""You are a senior technical recruiter and staff engineer reviewing a candidate for rejection or advancement. Be specific, technical, and always name exact technologies — never be generic.

Job Description:
{request.job_description[:3000]}

Candidate CV:
{request.cv[:3000]}

Base every judgment strictly on the content above. Return valid JSON only.

{{
  "score": <integer 0-100>,
  "level": "<Junior|Mid|Senior|Staff>",
  "free_critique": "<one brutal sentence: the single biggest red flag that would get this CV rejected in 10 seconds>",
  "missing_skills": ["<exact technology or concept name>"],
  "explanation": "<two sentences: why this candidate specifically fails the technical screen for this role>",
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
