from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import json
import re
import time
from dotenv import load_dotenv
import pdfplumber
import docx

load_dotenv()

# Rate limit configuration
request_history = {}
RATE_LIMIT_COUNT = 5
RATE_LIMIT_WINDOW = 3600

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


app = FastAPI()


@app.get("/")
async def root():
    return {"status": "alive", "message": "JobMatch Backend is awake"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jobmatch-fjik.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobRequest(BaseModel):
    job_description: str
    cv: str = ""


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

    # UPDATED PROMPT: Added free_critique and trap_to_avoid
    prompt = f"""
ROLE: Lead Technical Architect at a high-growth startup.
TASK: Audit this candidate for the specific role. Be technical and ruthless.

Job Description: {request.job_description[:1500]}
CV Content: {request.cv[:1500]}

JSON OUTPUT ONLY:
{{
  "score": 0-100,
  "level": "Identify seniority (Junior/Mid/Senior/Staff)",
  "free_critique": "A blunt, brutal 1-sentence reality check on why their CV might be rejected immediately.",
  "missing_skills": ["List 3-5 high-level architectural or library gaps"],
  "explanation": "Brutally honest 2-sentence summary of why they might fail the interview.",
  "cv_enhancement": {{
    "rewrite_bullet": "Rewrite their most relevant CV bullet point to be high-impact and metric-driven",
    "hidden_keywords": ["3 specific niche keywords the ATS is looking for"]
  }},
  "interview_prep": {{
    "killer_question": "The hardest technical question this specific company will ask based on the JD",
    "winning_answer": "A perfect, high-seniority response to that question",
    "trap_to_avoid": "The #1 specific thing or phrase this candidate should NEVER say during this interview."
  }},
  "priority_roadmap": [
    "A 48-hour 'Proof of Concept' project name to build to prove mastery",
    "The specific documentation page or advanced concept to read TONIGHT"
  ],
  "rejection_reasons": ["Technical mismatch point 1", "CV weakness point 2"]
}}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    ai_data = json.loads(
        re.search(r"\{.*\}", response.choices[0].message.content, re.DOTALL).group())

    return {
        "result": ai_data,
        "job_text": request.job_description,
        "cv_text": request.cv
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
