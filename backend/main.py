from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import json
import re
from dotenv import load_dotenv
import PyPDF2
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


@app.post("/extract", response_model=JobResponse)
def extract_skills(request: JobRequest):

    user_id = "default"

    if usage_tracker.get(user_id, 0) >= FREE_LIMIT:
        return {
            "core_skills": [],
            "skills": ["LIMIT REACHED"],
            "missing_skills": [],
            "level": "Upgrade",
            "score": 0,
            "explanation": "",
            "rejection_reasons": [],
            "priority_skills": []
        }

    usage_tracker[user_id] = usage_tracker.get(user_id, 0) + 1

    prompt = f"""

You are an expert career analyst.

Analyze the job description and optional CV.

IMPORTANT:

If CV is EMPTY:
- DO NOT assume candidate skills
- DO NOT compute a match score → return score = -1
- Only extract:
  - core skills
  - all skills
  - job level

If CV is PROVIDED:
- Compare CV vs job
- Compute:
  - missing skills
  - match score (0-100)
  - explanation
  - rejection reasons
  - priority skills

Tasks:
1. Extract core skills (3-5)
2. Extract all technical skills
3. Determine level

IF CV EXISTS ALSO:
4. Identify missing skills
5. Assign match score
6. Explain score
7. Rejection reasons
8. Priority skills

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
{request.job_description}

CV:
{request.cv if request.cv else "EMPTY"}
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

    return parsed


@app.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    text = ""

    if file.filename.endswith(".pdf"):
        reader = PyPDF2.PdfReader(file.file)
        for page in reader.pages:
            text += page.extract_text() or ""

    elif file.filename.endswith(".docx"):
        doc = docx.Document(file.file)
        for para in doc.paragraphs:
            text += para.text + "\n"

    else:
        text = (await file.read()).decode("utf-8")

    return {"text": text}
