from fastapi import FastAPI, UploadFile, File, Request
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import json
import re
from dotenv import load_dotenv
import pdfplumber
import docx

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In production, use Redis or a Database for this
usage_tracker = {}
FREE_LIMIT = 3


class JobRequest(BaseModel):
    job_description: str
    cv: str = ""


class JobResponse(BaseModel):
    core_skills: List[str]
    skills: List[str]
    missing_skills: List[str]
    level: str
    score: int
    explanation: str
    rejection_reasons: List[str]
    priority_skills: List[str]
    job_category: str
    recommended_course: dict


def detect_category(text):
    text = text.lower()
    if any(x in text for x in ["react", "frontend", "nextjs", "tailwind"]):
        return "frontend"
    if any(x in text for x in ["spring", "backend", "django", "node"]):
        return "backend"
    if any(x in text for x in ["data", "etl", "kafka", "sql"]):
        return "data engineering"
    if any(x in text for x in ["machine learning", "ml", "ai", "pytorch"]):
        return "machine learning"
    if any(x in text for x in ["devops", "docker", "kubernetes", "aws"]):
        return "devops"
    return "general"


COURSE_MAP = {
    "frontend": {"title": "Become a Frontend Developer", "link": "https://www.udemy.com/share/101Wvc/"},
    "backend": {"title": "Become a Backend Developer", "link": "https://www.udemy.com/share/1013gG/"},
    "data engineering": {"title": "Become a Data Engineer", "link": "https://www.udemy.com/share/104lbm/"},
    "machine learning": {"title": "Become a Machine Learning Engineer", "link": "https://www.udemy.com/share/10bYlh/"},
    "devops": {"title": "Become a DevOps Engineer", "link": "https://www.udemy.com/share/107YGQ/"},
    "general": {"title": "Become a Software Engineer", "link": "https://www.udemy.com/share/105wZ6/"}
}


@app.post("/extract", response_model=JobResponse)
def extract_skills(request: JobRequest, req: Request):
    user_id = req.headers.get("x-forwarded-for", req.client.host)

    # 1. CORRECTED LIMIT CHECK
    current_usage = usage_tracker.get(user_id, 0)
    if current_usage >= FREE_LIMIT:
        # We return a specific payload that the frontend recognizes as "Limit Reached"
        return {
            "core_skills": [],
            "skills": ["LIMIT REACHED"],
            "missing_skills": [],
            "level": "Upgrade",
            "score": 0,
            "explanation": "Please upgrade to see your full analysis.",
            "rejection_reasons": [],
            "priority_skills": [],
            "job_category": "",
            "recommended_course": {}
        }

    usage_tracker[user_id] = current_usage + 1

    # 2. PREPARE INPUTS
    cv_text = request.cv.strip()[:1500] if len(
        request.cv.strip()) > 30 else "EMPTY"
    job_text = request.job_description[:1200]
    job_category = detect_category(job_text)
    course = COURSE_MAP.get(job_category, COURSE_MAP["general"])

    prompt = f"""
    You are a strict technical recruiter. Analyze the job and CV.
    
    IF CV = EMPTY:
    - score = 0
    - explanation = "Please provide a CV for analysis."
    
    IF CV EXISTS:
    - Be strict. 
    - Provide a score (0-100) based on actual skill match.
    - List concrete missing technologies.
    
    Return ONLY JSON:
    {{
     "core_skills": [],
     "skills": [],
     "missing_skills": [],
     "level": "Junior/Mid/Senior",
     "score": 85,
     "explanation": "...",
     "rejection_reasons": [],
     "priority_skills": []
    }}

    Job: {job_text}
    CV: {cv_text}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Optimized model name
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        content = response.choices[0].message.content
        match = re.search(r"\{.*\}", content, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}
    except Exception as e:
        print(f"Error: {e}")
        parsed = {"score": 0, "explanation": "Error processing request."}

    # Ensure all keys exist
    defaults = {
        "core_skills": [], "skills": [], "missing_skills": [],
        "level": "N/A", "score": 0, "explanation": "",
        "rejection_reasons": [], "priority_skills": []
    }
    for key, val in defaults.items():
        if key not in parsed:
            parsed[key] = val

    parsed["job_category"] = job_category
    parsed["recommended_course"] = course

    return parsed


@app.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    text = ""
    try:
        if file.filename.endswith(".pdf"):
            with pdfplumber.open(file.file) as pdf:
                text = "".join(
                    [page.extract_text() or "" for page in pdf.pages])
        elif file.filename.endswith(".docx"):
            doc = docx.Document(file.file)
            text = "\n".join([para.text for para in doc.paragraphs])
        else:
            text = (await file.read()).decode("utf-8")
    except Exception:
        return {"text": "Error reading file"}

    return {"text": text}
