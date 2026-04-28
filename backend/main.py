from fastapi import FastAPI, UploadFile, File, Request
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from supabase import create_client, Client
import os
import json
import re
from dotenv import load_dotenv
import pdfplumber
import docx

load_dotenv()

# Initialize OpenAI & Supabase
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobRequest(BaseModel):
    job_description: str
    cv: str = ""


@app.post("/extract")
async def extract_skills(request: JobRequest):
    # 1. AI Analysis
    prompt = f"""
    Brutally honest recruiter analysis. Return JSON ONLY.
    Job: {request.job_description[:1000]}
    CV: {request.cv[:1000] if request.cv else "EMPTY"}
    
    Format:
    {{"score": 85, "level": "Mid", "missing_skills": [], "explanation": "", "rejection_reasons": [], "priority_skills": []}}
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    ai_data = json.loads(
        re.search(r"\{.*\}", response.choices[0].message.content, re.DOTALL).group())

    # 2. Save to Supabase
    db_entry = {
        "job_text": request.job_description,
        "cv_text": request.cv,
        "result": ai_data,
        "is_paid": False
    }

    data, count = supabase.table("reports").insert(db_entry).execute()
    report_id = data[1][0]['id']

    return {"id": report_id, "result": ai_data}


@app.post("/unlock/{report_id}")
async def unlock_report(report_id: str):
    # This is called when user returns from payment
    supabase.table("reports").update(
        {"is_paid": True}).eq("id", report_id).execute()
    return {"status": "unlocked"}


@app.get("/report/{report_id}")
async def get_report(report_id: str):
    data, count = supabase.table("reports").select(
        "*").eq("id", report_id).execute()
    if not data[1]:
        return {"error": "Not found"}
    return data[1][0]


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
