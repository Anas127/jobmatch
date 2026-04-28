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

# 🔥 simple IP-based tracking (better than "default")
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


# 🔥 simple category detection (fast, no GPT needed)
def detect_category(text):
    text = text.lower()

    if "react" in text or "frontend" in text:
        return "frontend"
    if "spring" in text or "backend" in text:
        return "backend"
    if "data" in text or "etl" in text:
        return "data engineering"
    if "machine learning" in text or "ml" in text:
        return "machine learning"
    if "devops" in text or "docker" in text:
        return "devops"

    return "general"


COURSE_MAP = {
    "frontend": {
        "title": "Complete Frontend Developer Roadmap",
        "link": "https://your-affiliate-link"
    },
    "backend": {
        "title": "Backend Developer Bootcamp",
        "link": "https://your-affiliate-link"
    },
    "data engineering": {
        "title": "Data Engineering Bootcamp",
        "link": "https://your-affiliate-link"
    },
    "machine learning": {
        "title": "Machine Learning Roadmap",
        "link": "https://your-affiliate-link"
    },
    "devops": {
        "title": "DevOps Roadmap Course",
        "link": "https://your-affiliate-link"
    },
    "general": {
        "title": "Complete Software Engineering Roadmap",
        "link": "https://your-affiliate-link"
    }
}


@app.post("/extract", response_model=JobResponse)
def extract_skills(request: JobRequest, req: Request):

    # 🔥 better tracking (per user IP)
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

    # 🔥 FIX CV BUG
    cv_text = request.cv.strip()

    if len(cv_text) < 50:
        cv_text = "EMPTY"
    else:
        # 🔥 trim CV (speed boost)
        cv_text = cv_text[:3000]

    job_category = detect_category(request.job_description)
    course = COURSE_MAP.get(job_category, COURSE_MAP["general"])

    prompt = f"""
Analyze job and optional CV.

Rules:
- If CV is EMPTY → score = -1
- If CV exists → compute score, missing skills, explanation

Return JSON:

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
{request.job_description}

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
        json_text = re.search(r"\{.*\}", content, re.DOTALL).group()
        parsed = json.loads(json_text)
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

    # 🔥 ADD MONETIZATION LAYER
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