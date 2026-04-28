from fastapi import FastAPI, UploadFile, File, Request
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os, json, re
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


# 🔥 CATEGORY DETECTION
def detect_category(text):
    text = text.lower()

    if "react" in text or "frontend" in text:
        return "frontend"
    if "spring" in text or "backend" in text:
        return "backend"
    if "data" in text or "etl" in text or "kafka" in text:
        return "data engineering"
    if "machine learning" in text or "ml" in text:
        return "machine learning"
    if "devops" in text or "docker" in text:
        return "devops"

    return "general"


COURSE_MAP = {
    "frontend": {
        "title": "Become a Frontend Developer",
        "link": "https://your-affiliate-link"
    },
    "backend": {
        "title": "Become a Backend Developer",
        "link": "https://your-affiliate-link"
    },
    "data engineering": {
        "title": "Become a Data Engineer",
        "link": "https://your-affiliate-link"
    },
    "machine learning": {
        "title": "Become a Machine Learning Engineer",
        "link": "https://your-affiliate-link"
    },
    "devops": {
        "title": "Become a DevOps Engineer",
        "link": "https://your-affiliate-link"
    },
    "general": {
        "title": "Become a Software Engineer",
        "link": "https://your-affiliate-link"
    }
}


@app.post("/extract", response_model=JobResponse)
def extract_skills(request: JobRequest, req: Request):

    user_id = req.client.host

    if usage_tracker.get(user_id, 0) >= FREE_LIMIT:
        return {
            "core_skills": [],
            "skills": ["LIMIT REACHED"],
            "missing_skills": [],
            "level": "Upgrade",
            "score": 0,
            "explanation": "",
            "rejection_reasons": [],
            "priority_skills": [],
            "job_category": "",
            "recommended_course": {}
        }

    usage_tracker[user_id] = usage_tracker.get(user_id, 0) + 1

    # 🔥 CLEAN CV
    cv_text = request.cv.strip()

    if len(cv_text) < 50:
        cv_text = "EMPTY"
    else:
        cv_text = cv_text[:3000]

    # 🔥 LIMIT JOB TEXT (SPEED)
    job_text = request.job_description[:2000]

    job_category = detect_category(job_text)
    course = COURSE_MAP.get(job_category, COURSE_MAP["general"])

    prompt = f"""
You are a strict technical recruiter.

Analyze job and CV.

RULES:

IF CV = EMPTY:
- score = -1
- DO NOT invent candidate skills

IF CV EXISTS:
- Be strict like a real recruiter
- ALWAYS return at least 3 missing skills
- Missing skills must be concrete technologies (Kafka, Docker, AWS, etc.)
- Provide 2-4 rejection reasons explaining why candidate would fail screening
- Return top 3 priority skills to learn first

Return ONLY JSON:

{{
 "core_skills": [],
 "skills": [],
 "missing_skills": [],
 "level": "",
 "score": 0,
 "explanation": "",
 "rejection_reasons": [],
 "priority_skills": []
}}

Job:
{job_text}

CV:
{cv_text}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    content = response.choices[0].message.content

    try:
        match = re.search(r"\{.*\}", content, re.DOTALL)

        if match:
            json_text = match.group()
            parsed = json.loads(json_text)
        else:
            raise ValueError("No JSON found")

    except:
        parsed = {
            "core_skills": [],
            "skills": ["Error"],
            "missing_skills": [],
            "level": "Unknown",
            "score": -1,
            "explanation": "",
            "rejection_reasons": [],
            "priority_skills": []
        }

    # 🔥 ADD MONETIZATION DATA
    parsed["job_category"] = job_category
    parsed["recommended_course"] = course

    return parsed


@app.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    text = ""

    if file.filename.endswith(".pdf"):
        with pdfplumber.open(file.file) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""

    elif file.filename.endswith(".docx"):
        doc = docx.Document(file.file)
        for para in doc.paragraphs:
            text += para.text + "\n"

    else:
        text = (await file.read()).decode("utf-8")

    return {"text": text}