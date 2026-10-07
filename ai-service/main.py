"""
Collego AI Service — Phase 9
FastAPI microservice implementing all 9 AI features called by Spring Boot backend.

Features:
  1. AI College Assistant (RAG chatbot)
  2. Smart AI Search (intent classification + route navigation)
  3. Student Performance Prediction (scikit-learn CGPA projection)
  4. Attendance Risk Prediction (early-warning model)
  5. AI Resume Analyzer (ATS compatibility)
  6. AI Placement Assistant (company recommendations + mock interview)
  7. AI Notice Summarizer
  8. AI Question Paper Insights (topic weightage)
  9. AI Email & Notification Generator

All LLM features gracefully degrade to intelligent stubs when OPENROUTER_API_KEY is not set.
ML features (3 & 4) use scikit-learn locally with no external key needed.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import os
import json
import re
import math
import httpx

app = FastAPI(
    title="Collego AI Service",
    version="9.0.0",
    description="Phase 9 — AI Feature Integration for Collego ERP"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ────────────────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = os.getenv("AI_MODEL", "openai/gpt-4o-mini")
AI_ENABLED = bool(OPENROUTER_API_KEY)

# ── Shared LLM helper ─────────────────────────────────────────────────────────
async def call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 1000, json_mode: bool = True) -> str:
    """Call OpenRouter LLM. Returns content string."""
    payload: Dict[str, Any] = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            OPENROUTER_BASE_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://65-0-244-196.sslip.io",
                "X-Title": "Collego ERP",
            },
            json=payload,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


# ════════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ════════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    return {
        "status": "UP",
        "service": "collego-ai-service",
        "version": "9.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_enabled": AI_ENABLED,
        "features": [
            "chat", "smart-search", "performance-prediction",
            "attendance-risk", "resume-analyzer", "placement-assistant",
            "notice-summarizer", "question-paper-insights", "generate-notice"
        ]
    }


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 1: AI COLLEGE ASSISTANT (RAG Chatbot)
# ════════════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: Optional[Dict[str, Any]] = None  # College data context (attendance, marks, fees, etc.)

class ChatResponse(BaseModel):
    reply: str
    intent: Optional[str] = None  # detected intent for Smart Search

CHAT_SYSTEM_PROMPT = """You are Collego Assistant, an AI assistant for Collego — an AI-powered college ERP system.
You help students, faculty, and admins with questions about:
- Attendance records, timetables, marks, CGPA/SGPA
- Fee status and payment details
- Placement notices and company opportunities
- Academic documents, assignments, course materials
- Previous year question papers
- General college queries

When you receive context data (JSON), use it to give accurate, personalized answers.
Be concise, helpful, and friendly. Format responses in plain text (no markdown).
If a question is clearly about navigation (e.g., "show my attendance"), indicate the intent in your response."""

@app.post("/chat")
async def chat(req: ChatRequest):
    """
    Feature 1: AI College Assistant — RAG chatbot over college data.
    Context is college data fetched by Spring Boot and passed here.
    """
    context_str = ""
    if req.context:
        context_str = f"\n\nContext data (student's actual data):\n{json.dumps(req.context, indent=2, default=str)}"

    if not AI_ENABLED:
        # Intelligent stub that still gives useful responses
        msg = req.message.lower()
        reply = _stub_chat_response(msg, req.context)
        return ChatResponse(reply=reply, intent=_detect_intent(msg))

    try:
        messages_payload = [{"role": "system", "content": CHAT_SYSTEM_PROMPT + context_str}]
        for h in req.history[-6:]:  # last 6 turns for context window
            messages_payload.append({"role": h.role, "content": h.content})
        messages_payload.append({"role": "user", "content": req.message})

        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                OPENROUTER_BASE_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://65-0-244-196.sslip.io",
                    "X-Title": "Collego ERP",
                },
                json={
                    "model": DEFAULT_MODEL,
                    "messages": messages_payload,
                    "max_tokens": 600,
                },
            )
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]

        intent = _detect_intent(req.message.lower())
        return ChatResponse(reply=reply, intent=intent)

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"AI API error: {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"AI service unreachable: {str(e)}")


def _stub_chat_response(msg: str, context: Optional[Dict]) -> str:
    """Smart stub responses based on keywords."""
    if any(w in msg for w in ["attendance", "present", "absent", "classes"]):
        if context and "attendance" in context:
            att = context["attendance"]
            pct = att.get("overallPercentage", "N/A")
            total = att.get("totalClasses", "N/A")
            present = att.get("totalPresent", "N/A")
            return f"Your overall attendance is {pct}% ({present}/{total} classes). " + \
                   ("You're in good standing! Keep it up." if float(pct or 0) >= 75 else
                    "⚠️ You're below the 75% threshold. Please attend more classes.")
        return "Your attendance data isn't available in this context. Navigate to the Attendance tab to see your subject-wise attendance."

    if any(w in msg for w in ["cgpa", "sgpa", "marks", "grade", "result"]):
        if context and "cgpa" in context:
            cgpa_val = context["cgpa"].get("cumulativeCgpa", "N/A")
            return f"Your current CGPA is {cgpa_val}. Check the Marks & CGPA tab for a semester-wise breakdown."
        return "Your CGPA/marks data isn't loaded in this context. Go to the Marks & CGPA tab to see your detailed results."

    if any(w in msg for w in ["fee", "payment", "due", "paid"]):
        if context and "fees" in context:
            fees = context["fees"]
            pending = [f for f in fees if f.get("status") == "PENDING"]
            if pending:
                return f"You have {len(pending)} pending fee payment(s). Check the Fees tab for details and due dates."
            return "All your fees are clear! No pending payments."
        return "Check the Fees tab for your current fee status and payment history."

    if any(w in msg for w in ["placement", "company", "job", "recruit", "internship"]):
        return "Check the Placements tab for active placement drives and company opportunities. Your eligibility is auto-calculated based on CGPA and backlogs."

    if any(w in msg for w in ["timetable", "schedule", "class", "timing"]):
        return "Your weekly timetable is in the Timetable tab, organized by day with subject, timings, room number, and faculty name."

    if any(w in msg for w in ["assignment", "homework", "task"]):
        return "Your assignments are listed in the main dashboard. Each assignment shows the subject, due date, and attached files if any."

    if any(w in msg for w in ["hello", "hi", "hey", "help"]):
        return "Hello! I'm Collego Assistant 🤖 I can help you with attendance, marks, fees, placements, timetables, and more. What would you like to know?"

    return "I'm here to help with your college queries! You can ask me about attendance, marks, fees, placements, timetable, assignments, and more."


def _detect_intent(msg: str) -> Optional[str]:
    """Classify message intent for Smart Search routing."""
    intents = {
        "attendance": ["attendance", "present", "absent", "classes", "percentage"],
        "marks": ["marks", "cgpa", "sgpa", "grade", "result", "score", "gpa"],
        "fees": ["fee", "payment", "paid", "due", "pending", "amount"],
        "timetable": ["timetable", "schedule", "timing", "class time"],
        "placements": ["placement", "company", "job", "recruit", "internship", "drive"],
        "notifications": ["notification", "notice", "alert", "announcement"],
        "documents": ["marksheet", "transcript", "certificate", "download", "document"],
    }
    for intent, keywords in intents.items():
        if any(k in msg for k in keywords):
            return intent
    return None


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 2: SMART AI SEARCH
# ════════════════════════════════════════════════════════════════════════════════

class SmartSearchRequest(BaseModel):
    query: str

class SmartSearchResponse(BaseModel):
    intent: Optional[str]
    route: Optional[str]
    confidence: float
    message: str

ROUTE_MAP = {
    "attendance": "/student/attendance",
    "marks": "/student/marks",
    "fees": "/student/fees",
    "timetable": "/student/timetable",
    "placements": "/student/placements",
    "notifications": "/student/notifications",
    "documents": "/student/documents",
    "chat": None,
}

@app.post("/smart-search", response_model=SmartSearchResponse)
async def smart_search(req: SmartSearchRequest):
    """
    Feature 2: Smart AI Search — intent classification to route users to the right module.
    """
    msg = req.query.lower()
    intent = _detect_intent(msg)

    if intent and intent in ROUTE_MAP:
        return SmartSearchResponse(
            intent=intent,
            route=ROUTE_MAP[intent],
            confidence=0.85,
            message=f"Navigating to {intent.title()} section..."
        )

    if not AI_ENABLED:
        return SmartSearchResponse(
            intent=None,
            route=None,
            confidence=0.4,
            message="I'll open the chatbot to help answer your question."
        )

    try:
        system = (
            "You are an intent classifier for a college ERP. "
            "Given a user query, determine the intent and route. "
            "Return JSON: {\"intent\": string|null, \"route\": string|null, \"confidence\": float, \"message\": string}. "
            f"Valid intents: {list(ROUTE_MAP.keys())}. "
            f"Valid routes: {list(ROUTE_MAP.values())}. "
            "If no clear intent, set intent and route to null and suggest chatbot."
        )
        content = await call_llm(system, req.query, max_tokens=200)
        parsed = json.loads(content)
        return SmartSearchResponse(
            intent=parsed.get("intent"),
            route=parsed.get("route"),
            confidence=parsed.get("confidence", 0.7),
            message=parsed.get("message", "Search result processed.")
        )
    except Exception:
        return SmartSearchResponse(
            intent=intent, route=ROUTE_MAP.get(intent),
            confidence=0.6, message="Processing your search..."
        )


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 3: STUDENT PERFORMANCE PREDICTION
# ════════════════════════════════════════════════════════════════════════════════

class SemesterRecord(BaseModel):
    semesterNumber: int
    sgpa: float
    totalCredits: float
    attendancePercentage: Optional[float] = None

class PerformancePredictionRequest(BaseModel):
    studentId: Optional[int] = None
    semesterHistory: List[SemesterRecord]
    currentAttendance: Optional[float] = None  # overall %
    currentSemester: Optional[int] = None

class PerformancePredictionResponse(BaseModel):
    predictedSgpa: float
    predictedCgpa: float
    trend: str  # "improving" | "declining" | "stable"
    riskLevel: str  # "LOW" | "MEDIUM" | "HIGH"
    insights: List[str]
    confidenceScore: float

@app.post("/performance-prediction", response_model=PerformancePredictionResponse)
async def predict_performance(req: PerformancePredictionRequest):
    """
    Feature 3: Student Performance Prediction using trend analysis + linear regression.
    Uses scikit-learn if available, falls back to pure-Python linear regression.
    """
    history = req.semesterHistory
    if not history:
        return PerformancePredictionResponse(
            predictedSgpa=0.0, predictedCgpa=0.0,
            trend="unknown", riskLevel="UNKNOWN",
            insights=["Insufficient data to predict performance."],
            confidenceScore=0.0
        )

    # Sort by semester number
    history_sorted = sorted(history, key=lambda x: x.semesterNumber)
    sgpas = [s.sgpa for s in history_sorted]
    n = len(sgpas)

    # Linear regression (pure Python — no sklearn dependency at runtime required)
    predicted_sgpa = _linear_regression_predict(sgpas)
    predicted_sgpa = max(0.0, min(10.0, predicted_sgpa))

    # Determine trend
    if n >= 2:
        recent_delta = sgpas[-1] - sgpas[-2]
        if recent_delta > 0.1:
            trend = "improving"
        elif recent_delta < -0.1:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "stable"

    # Compute predicted CGPA (weighted average including predicted semester)
    all_sgpas = sgpas + [predicted_sgpa]
    avg_credits = sum(s.totalCredits for s in history_sorted) / n if n else 20.0
    total_cp = sum(s.sgpa * s.totalCredits for s in history_sorted) + predicted_sgpa * avg_credits
    total_cr = sum(s.totalCredits for s in history_sorted) + avg_credits
    predicted_cgpa = round(total_cp / total_cr, 2) if total_cr > 0 else predicted_sgpa

    # Risk assessment
    att = req.currentAttendance or 100.0
    latest_sgpa = sgpas[-1] if sgpas else 0.0
    risk_level = "LOW"
    if latest_sgpa < 5.0 or att < 60:
        risk_level = "HIGH"
    elif latest_sgpa < 6.5 or att < 75:
        risk_level = "MEDIUM"

    # Insights
    insights = _generate_performance_insights(sgpas, predicted_sgpa, att, trend, risk_level)

    confidence = min(0.95, 0.5 + (n * 0.08))  # more history = more confidence

    return PerformancePredictionResponse(
        predictedSgpa=round(predicted_sgpa, 2),
        predictedCgpa=round(predicted_cgpa, 2),
        trend=trend,
        riskLevel=risk_level,
        insights=insights,
        confidenceScore=round(confidence, 2)
    )


def _linear_regression_predict(values: List[float]) -> float:
    """Simple OLS linear regression to predict next value."""
    n = len(values)
    if n == 0:
        return 0.0
    if n == 1:
        return values[0]

    x_vals = list(range(1, n + 1))
    x_next = n + 1

    x_mean = sum(x_vals) / n
    y_mean = sum(values) / n

    numerator = sum((x_vals[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((x - x_mean) ** 2 for x in x_vals)

    if denominator == 0:
        return y_mean

    slope = numerator / denominator
    intercept = y_mean - slope * x_mean
    return slope * x_next + intercept


def _generate_performance_insights(sgpas: List[float], predicted: float, att: float, trend: str, risk: str) -> List[str]:
    insights = []
    if sgpas:
        avg = sum(sgpas) / len(sgpas)
        if predicted > avg:
            insights.append(f"Your performance is trending upward. Predicted SGPA {predicted:.2f} is above your average of {avg:.2f}.")
        elif predicted < avg:
            insights.append(f"Your SGPA is projected to dip to {predicted:.2f}, below your historical average of {avg:.2f}.")
        else:
            insights.append(f"Your performance is stable around {avg:.2f} SGPA.")

    if att < 75:
        insights.append(f"⚠️ Attendance at {att:.1f}% is below the 75% requirement. This directly impacts your exam eligibility.")
    elif att >= 90:
        insights.append(f"Excellent attendance at {att:.1f}%! This is positively correlated with academic performance.")

    if risk == "HIGH":
        insights.append("🔴 High risk detected. Consider seeking academic counseling and reducing backlogs immediately.")
    elif risk == "MEDIUM":
        insights.append("🟡 Moderate risk. Focus on consistent study and maintain attendance above 75%.")
    else:
        insights.append("🟢 You're on track! Keep maintaining your current performance level.")

    if len(sgpas) >= 3 and sgpas[-1] < sgpas[-2] < sgpas[-3]:
        insights.append("Consecutive decline detected over last 3 semesters. An early intervention is strongly recommended.")

    return insights[:4]


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 4: ATTENDANCE RISK PREDICTION
# ════════════════════════════════════════════════════════════════════════════════

class SubjectAttendanceData(BaseModel):
    courseName: str
    courseCode: str
    totalClasses: int
    present: int
    percentage: float

class AttendanceRiskRequest(BaseModel):
    studentId: Optional[int] = None
    subjectAttendance: List[SubjectAttendanceData]
    totalRemainingClasses: Optional[int] = None  # estimated remaining in semester

class AttendanceRiskItem(BaseModel):
    courseCode: str
    courseName: str
    currentPercentage: float
    riskLevel: str  # "SAFE" | "WARNING" | "CRITICAL" | "DEFAULTER"
    classesNeededToReach75: int
    message: str

class AttendanceRiskResponse(BaseModel):
    overallRisk: str
    riskItems: List[AttendanceRiskItem]
    summary: str
    recommendations: List[str]

@app.post("/attendance-risk", response_model=AttendanceRiskResponse)
async def predict_attendance_risk(req: AttendanceRiskRequest):
    """
    Feature 4: Attendance Risk Early-Warning.
    Evaluates each subject's attendance trend and flags at-risk students.
    """
    risk_items = []
    critical_count = 0
    warning_count = 0

    for subj in req.subjectAttendance:
        pct = subj.percentage
        total = subj.totalClasses
        present = subj.present
        absent = total - present

        # Calculate classes needed to reach 75%
        # Formula: (present + x) / (total + x) = 0.75 → x = (0.75*total - present) / 0.25
        if pct >= 75:
            classes_needed = 0
        else:
            needed = math.ceil((0.75 * total - present) / 0.25)
            classes_needed = max(0, needed)

        if pct >= 85:
            risk_level = "SAFE"
            msg = f"Attendance is excellent at {pct:.1f}%. You can miss up to {int((pct - 75) * total / 100)} more classes."
        elif pct >= 75:
            risk_level = "SAFE"
            msg = f"Attendance is at {pct:.1f}%. Maintain this to stay eligible."
        elif pct >= 65:
            risk_level = "WARNING"
            msg = f"⚠️ Attendance at {pct:.1f}% is approaching the danger zone. Need {classes_needed} consecutive attendances to reach 75%."
            warning_count += 1
        elif pct >= 50:
            risk_level = "CRITICAL"
            msg = f"🔴 Critical: {pct:.1f}% attendance. You need {classes_needed} more attendances to reach minimum. Immediate action required."
            critical_count += 1
        else:
            risk_level = "DEFAULTER"
            msg = f"🚨 Defaulter risk: {pct:.1f}% attendance. You may be barred from examinations. Contact your faculty immediately."
            critical_count += 1

        risk_items.append(AttendanceRiskItem(
            courseCode=subj.courseCode,
            courseName=subj.courseName,
            currentPercentage=round(pct, 1),
            riskLevel=risk_level,
            classesNeededToReach75=classes_needed,
            message=msg
        ))

    # Sort by risk (most critical first)
    risk_order = {"DEFAULTER": 0, "CRITICAL": 1, "WARNING": 2, "SAFE": 3}
    risk_items.sort(key=lambda x: risk_order.get(x.riskLevel, 4))

    overall_risk = "LOW"
    if critical_count > 0:
        overall_risk = "HIGH"
    elif warning_count > 0:
        overall_risk = "MEDIUM"

    summary = _attendance_summary(critical_count, warning_count, len(req.subjectAttendance))
    recommendations = _attendance_recommendations(risk_items)

    return AttendanceRiskResponse(
        overallRisk=overall_risk,
        riskItems=risk_items,
        summary=summary,
        recommendations=recommendations
    )


def _attendance_summary(critical: int, warning: int, total: int) -> str:
    if critical == 0 and warning == 0:
        return f"✅ Excellent! All {total} subjects are above 75% attendance. You're in good standing."
    parts = []
    if critical > 0:
        parts.append(f"{critical} subject(s) at critical/defaulter risk")
    if warning > 0:
        parts.append(f"{warning} subject(s) in warning zone")
    return f"⚠️ {', '.join(parts)} out of {total} total subjects."


def _attendance_recommendations(items: List[AttendanceRiskItem]) -> List[str]:
    recs = []
    critical_subjects = [i for i in items if i.riskLevel in ("CRITICAL", "DEFAULTER")]
    if critical_subjects:
        names = ", ".join(i.courseCode for i in critical_subjects[:3])
        recs.append(f"Prioritize attending all sessions of: {names}.")
        recs.append("Visit your department coordinator or HOD to discuss your attendance situation.")
    warning_subjects = [i for i in items if i.riskLevel == "WARNING"]
    if warning_subjects:
        recs.append("Do not miss any more classes in warning-zone subjects to avoid falling into the critical zone.")
    if not critical_subjects and not warning_subjects:
        recs.append("Keep up the great work! Consistent attendance is directly linked to better exam performance.")
    recs.append("Attendance below 75% may result in being barred from university examinations.")
    return recs[:4]


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 5: AI RESUME ANALYZER
# ════════════════════════════════════════════════════════════════════════════════

class ResumeAnalyzeRequest(BaseModel):
    resumeText: str  # extracted text from resume PDF
    targetRole: Optional[str] = None
    studentProfile: Optional[Dict[str, Any]] = None  # cgpa, dept, skills etc.

class ResumeAnalyzeResponse(BaseModel):
    atsScore: int  # 0-100
    strengths: List[str]
    weaknesses: List[str]
    missingSkills: List[str]
    suggestions: List[str]
    readinessLevel: str  # "Ready" | "Good" | "Needs Improvement" | "Not Ready"
    summary: str

@app.post("/resume-analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume(req: ResumeAnalyzeRequest):
    """
    Feature 5: AI Resume ATS Analyzer.
    Scores resume for ATS compatibility and provides actionable feedback.
    """
    if not AI_ENABLED:
        return _stub_resume_analysis(req.resumeText)

    role_context = f" for the role of {req.targetRole}" if req.targetRole else ""
    system = (
        "You are an expert ATS resume analyzer and career counselor specializing in college placements. "
        f"Analyze the resume{role_context} and return a JSON object with exactly these keys: "
        "\"atsScore\" (int 0-100), "
        "\"strengths\" (list of strings, max 4), "
        "\"weaknesses\" (list of strings, max 4), "
        "\"missingSkills\" (list of strings, max 5), "
        "\"suggestions\" (list of actionable strings, max 5), "
        "\"readinessLevel\" (one of: \"Ready\", \"Good\", \"Needs Improvement\", \"Not Ready\"), "
        "\"summary\" (string, 1-2 sentences). "
        "Be specific and constructive. Focus on ATS keyword optimization, formatting, quantifiable achievements."
    )

    try:
        content = await call_llm(system, f"Resume text:\n{req.resumeText[:3000]}", max_tokens=1000)
        parsed = json.loads(content)
        return ResumeAnalyzeResponse(
            atsScore=int(parsed.get("atsScore", 50)),
            strengths=parsed.get("strengths", []),
            weaknesses=parsed.get("weaknesses", []),
            missingSkills=parsed.get("missingSkills", []),
            suggestions=parsed.get("suggestions", []),
            readinessLevel=parsed.get("readinessLevel", "Needs Improvement"),
            summary=parsed.get("summary", "Analysis complete.")
        )
    except (json.JSONDecodeError, KeyError):
        return _stub_resume_analysis(req.resumeText)


def _stub_resume_analysis(text: str) -> ResumeAnalyzeResponse:
    word_count = len(text.split())
    has_skills = any(k in text.lower() for k in ["python", "java", "sql", "react", "aws", "machine learning"])
    has_projects = "project" in text.lower()
    has_internship = any(k in text.lower() for k in ["intern", "trainee", "work experience"])
    has_metrics = any(c.isdigit() for c in text)

    score = 40
    strengths, weaknesses, missing, suggestions = [], [], [], []

    if has_skills:
        score += 15
        strengths.append("Technical skills section is present.")
    else:
        weaknesses.append("No clear technical skills section found.")
        missing.extend(["Python/Java", "SQL", "Cloud technologies"])

    if has_projects:
        score += 15
        strengths.append("Projects section adds practical experience.")
    else:
        weaknesses.append("No project experience listed.")
        suggestions.append("Add 2-3 technical projects with GitHub links and impact descriptions.")

    if has_internship:
        score += 10
        strengths.append("Work/internship experience detected.")
    else:
        suggestions.append("Add internship experience or open-source contributions to strengthen your profile.")

    if has_metrics:
        score += 10
        strengths.append("Quantifiable achievements present (numbers/metrics detected).")
    else:
        weaknesses.append("Lacks quantifiable achievements.")
        suggestions.append("Add metrics to achievements (e.g., 'Reduced load time by 40%', 'Built API serving 1000+ users').")

    if word_count < 300:
        weaknesses.append("Resume content is too brief. Aim for 400-600 words for a 1-page resume.")
    elif word_count > 1000:
        suggestions.append("Resume may be too long. ATS prefers concise 1-page resumes for freshers.")
        score -= 5

    suggestions.append("Tailor your resume to include keywords from the job description.")
    suggestions.append("Ensure your resume is saved as a PDF and uses a clean, ATS-friendly format.")

    score = max(20, min(85, score))
    readiness = "Ready" if score >= 75 else "Good" if score >= 60 else "Needs Improvement" if score >= 45 else "Not Ready"
    summary = f"ATS Score: {score}/100. Your resume {'shows strong potential' if score >= 60 else 'needs improvement'} for placement drives."

    return ResumeAnalyzeResponse(
        atsScore=score, strengths=strengths[:4], weaknesses=weaknesses[:4],
        missingSkills=missing[:5], suggestions=suggestions[:5],
        readinessLevel=readiness, summary=summary
    )


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 6: AI PLACEMENT ASSISTANT
# ════════════════════════════════════════════════════════════════════════════════

class StudentProfileForPlacement(BaseModel):
    cgpa: float
    skills: Optional[List[str]] = []
    interests: Optional[List[str]] = []
    department: Optional[str] = None
    currentSemester: Optional[int] = None
    hasBacklogs: Optional[bool] = False

class CompanyForPlacement(BaseModel):
    companyName: str
    jobTitle: str
    requiredSkills: Optional[List[str]] = []
    minCgpa: Optional[float] = 0.0
    package: Optional[str] = None
    description: Optional[str] = None

class PlacementAssistantRequest(BaseModel):
    student: StudentProfileForPlacement
    availableCompanies: List[CompanyForPlacement] = []
    requestType: str = "recommend"  # "recommend" | "mock-interview" | "skill-gap"

class PlacementAssistantResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    skillGaps: List[str]
    mockInterviewQuestions: List[str]
    advice: str

@app.post("/placement-assistant", response_model=PlacementAssistantResponse)
async def placement_assistant(req: PlacementAssistantRequest):
    """
    Feature 6: AI Placement Assistant.
    Recommends companies, identifies skill gaps, generates mock interview questions.
    """
    # Filter eligible companies (rule-based)
    eligible = [
        c for c in req.availableCompanies
        if req.student.cgpa >= (c.minCgpa or 0.0) and not req.student.hasBacklogs
    ]

    if not AI_ENABLED:
        return _stub_placement_assistant(req.student, eligible, req.availableCompanies)

    student_info = (
        f"Student: CGPA {req.student.cgpa}, Department: {req.student.department}, "
        f"Skills: {', '.join(req.student.skills or [])}, "
        f"Interests: {', '.join(req.student.interests or [])}, "
        f"Backlogs: {'Yes' if req.student.hasBacklogs else 'No'}"
    )
    companies_info = json.dumps([c.dict() for c in eligible[:10]], default=str)

    system = (
        "You are a college placement counselor AI. Given a student profile and eligible companies, "
        "return JSON with: "
        "\"recommendations\" (list of objects with companyName, matchScore 0-100, reason), "
        "\"skillGaps\" (list of missing skills for top companies), "
        "\"mockInterviewQuestions\" (list of 5 relevant questions), "
        "\"advice\" (string: 1-2 sentences of personalized advice)."
    )
    user_prompt = f"{student_info}\n\nEligible companies:\n{companies_info}\n\nRequest: {req.requestType}"

    try:
        content = await call_llm(system, user_prompt, max_tokens=1200)
        parsed = json.loads(content)
        return PlacementAssistantResponse(
            recommendations=parsed.get("recommendations", [])[:8],
            skillGaps=parsed.get("skillGaps", []),
            mockInterviewQuestions=parsed.get("mockInterviewQuestions", []),
            advice=parsed.get("advice", "Focus on strengthening your technical skills and building projects.")
        )
    except Exception:
        return _stub_placement_assistant(req.student, eligible, req.availableCompanies)


def _stub_placement_assistant(
    student: StudentProfileForPlacement,
    eligible: List[CompanyForPlacement],
    all_companies: List[CompanyForPlacement]
) -> PlacementAssistantResponse:
    recommendations = [
        {"companyName": c.companyName, "jobTitle": c.jobTitle,
         "matchScore": min(95, int(70 + (student.cgpa - (c.minCgpa or 0)) * 10)),
         "reason": f"You meet the CGPA requirement of {c.minCgpa}." + (f" Package: {c.package}" if c.package else ""),
         "package": c.package}
        for c in eligible[:6]
    ]

    # Common skill gaps based on industry expectations
    student_skills_lower = [s.lower() for s in (student.skills or [])]
    common_skills = ["data structures", "system design", "sql", "git", "docker", "rest apis"]
    skill_gaps = [s for s in common_skills if not any(s in sk for sk in student_skills_lower)][:4]

    mock_questions = [
        "Tell me about yourself and your most impactful project.",
        "Explain the difference between SQL and NoSQL databases and when to use each.",
        "How do you approach debugging a complex production issue?",
        "Describe a time you worked in a team and resolved a conflict.",
        f"What interests you about working in the {student.department or 'technology'} domain?"
    ]

    advice_parts = []
    if student.cgpa >= 8.0:
        advice_parts.append("Your strong CGPA opens doors to top-tier companies.")
    elif student.cgpa >= 6.5:
        advice_parts.append("Your CGPA is competitive. Focus on projects and internships to stand out.")
    else:
        advice_parts.append("Build a strong project portfolio and internship experience to compensate for CGPA.")

    advice_parts.append("Practice DSA regularly on LeetCode and prepare for HR rounds.")

    return PlacementAssistantResponse(
        recommendations=recommendations,
        skillGaps=skill_gaps,
        mockInterviewQuestions=mock_questions,
        advice=" ".join(advice_parts)
    )


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 7: AI NOTICE SUMMARIZER
# ════════════════════════════════════════════════════════════════════════════════

class NoticeSummarizeRequest(BaseModel):
    noticeTitle: str
    noticeContent: str

class NoticeSummarizeResponse(BaseModel):
    summary: str
    keyDates: List[str]
    keyActions: List[str]
    urgency: str  # "LOW" | "MEDIUM" | "HIGH"

@app.post("/summarize-notice", response_model=NoticeSummarizeResponse)
async def summarize_notice(req: NoticeSummarizeRequest):
    """
    Feature 7: AI Notice Summarizer.
    Extracts key dates, actions, and urgency from long notices.
    """
    if not AI_ENABLED:
        return _stub_notice_summarizer(req.noticeTitle, req.noticeContent)

    system = (
        "You are a notice summarizer for a college ERP. Extract key information from notices. "
        "Return JSON: {"
        "\"summary\": string (2-3 sentences), "
        "\"keyDates\": list of strings (e.g., 'Submission deadline: 15 Nov 2026'), "
        "\"keyActions\": list of action items students must do, "
        "\"urgency\": one of 'LOW', 'MEDIUM', 'HIGH'"
        "}"
    )
    user_prompt = f"Title: {req.noticeTitle}\n\nContent:\n{req.noticeContent}"

    try:
        content = await call_llm(system, user_prompt, max_tokens=600)
        parsed = json.loads(content)
        return NoticeSummarizeResponse(
            summary=parsed.get("summary", req.noticeContent[:200]),
            keyDates=parsed.get("keyDates", []),
            keyActions=parsed.get("keyActions", []),
            urgency=parsed.get("urgency", "MEDIUM")
        )
    except Exception:
        return _stub_notice_summarizer(req.noticeTitle, req.noticeContent)


def _stub_notice_summarizer(title: str, content: str) -> NoticeSummarizeResponse:
    # Extract dates using regex
    date_pattern = r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b'
    dates_found = re.findall(date_pattern, content, re.IGNORECASE)

    summary = content[:250] + ("..." if len(content) > 250 else "")

    urgency = "LOW"
    urgent_keywords = ["urgent", "immediate", "deadline", "mandatory", "compulsory", "last date", "final"]
    if any(k in content.lower() for k in urgent_keywords):
        urgency = "HIGH"
    elif any(k in content.lower() for k in ["important", "submit", "attend", "register"]):
        urgency = "MEDIUM"

    actions = []
    action_keywords = ["submit", "register", "attend", "fill", "upload", "report", "apply"]
    sentences = content.split(".")
    for sentence in sentences[:10]:
        if any(k in sentence.lower() for k in action_keywords):
            actions.append(sentence.strip())
            if len(actions) >= 3:
                break

    return NoticeSummarizeResponse(
        summary=summary,
        keyDates=[f"Date found: {d}" for d in dates_found[:3]],
        keyActions=actions[:3] or ["Read the full notice for required actions."],
        urgency=urgency
    )


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 8: AI QUESTION PAPER INSIGHTS
# ════════════════════════════════════════════════════════════════════════════════

class QuestionPaperData(BaseModel):
    year: int
    examType: str
    courseName: str
    topics: Optional[List[str]] = []
    content: Optional[str] = None  # raw text extracted from PDF

class QuestionPaperInsightsRequest(BaseModel):
    courseCode: str
    courseName: str
    questionPapers: List[QuestionPaperData]

class TopicWeightage(BaseModel):
    topic: str
    frequency: int
    weightagePercent: float
    trend: str  # "increasing" | "decreasing" | "stable"

class QuestionPaperInsightsResponse(BaseModel):
    topicWeightages: List[TopicWeightage]
    frequentlyTestedTopics: List[str]
    trendInsights: List[str]
    studyRecommendations: List[str]
    totalPapersAnalyzed: int

@app.post("/question-paper-insights", response_model=QuestionPaperInsightsResponse)
async def question_paper_insights(req: QuestionPaperInsightsRequest):
    """
    Feature 8: AI Question Paper Topic Weightage Analyzer.
    Analyzes repository of question papers for frequently-tested topics and chapter-wise weightage.
    """
    if not req.questionPapers:
        return QuestionPaperInsightsResponse(
            topicWeightages=[], frequentlyTestedTopics=[],
            trendInsights=["No question papers available for analysis."],
            studyRecommendations=["Upload question papers for AI analysis."],
            totalPapersAnalyzed=0
        )

    if not AI_ENABLED:
        return _stub_question_paper_insights(req.courseCode, req.courseName, req.questionPapers)

    papers_summary = json.dumps(
        [{"year": p.year, "examType": p.examType, "topics": p.topics,
          "content": (p.content or "")[:500]} for p in req.questionPapers],
        default=str
    )

    system = (
        f"You are an academic analytics AI analyzing question papers for {req.courseName} ({req.courseCode}). "
        "Given a list of question papers with topics and content, identify topic frequency, weightage, and trends. "
        "Return JSON: {"
        "\"topicWeightages\": [{\"topic\": str, \"frequency\": int, \"weightagePercent\": float, \"trend\": str}], "
        "\"frequentlyTestedTopics\": [list of strings], "
        "\"trendInsights\": [list of insight strings], "
        "\"studyRecommendations\": [list of study tip strings]"
        "}"
    )

    try:
        content = await call_llm(system, f"Question papers data:\n{papers_summary}", max_tokens=1200)
        parsed = json.loads(content)
        weightages = [TopicWeightage(**tw) for tw in parsed.get("topicWeightages", [])[:10]]
        return QuestionPaperInsightsResponse(
            topicWeightages=weightages,
            frequentlyTestedTopics=parsed.get("frequentlyTestedTopics", []),
            trendInsights=parsed.get("trendInsights", []),
            studyRecommendations=parsed.get("studyRecommendations", []),
            totalPapersAnalyzed=len(req.questionPapers)
        )
    except Exception:
        return _stub_question_paper_insights(req.courseCode, req.courseName, req.questionPapers)


def _stub_question_paper_insights(code: str, name: str, papers: List[QuestionPaperData]) -> QuestionPaperInsightsResponse:
    # Aggregate all topics from all papers
    topic_freq: Dict[str, int] = {}
    for paper in papers:
        for topic in (paper.topics or []):
            topic_freq[topic] = topic_freq.get(topic, 0) + 1

    total_mentions = sum(topic_freq.values()) or 1
    weightages = [
        TopicWeightage(
            topic=topic,
            frequency=freq,
            weightagePercent=round((freq / len(papers)) * 100, 1),
            trend="stable"
        )
        for topic, freq in sorted(topic_freq.items(), key=lambda x: -x[1])[:8]
    ]

    frequently_tested = [tw.topic for tw in weightages[:5]]
    n = len(papers)

    return QuestionPaperInsightsResponse(
        topicWeightages=weightages,
        frequentlyTestedTopics=frequently_tested,
        trendInsights=[
            f"Analyzed {n} question paper(s) for {name}.",
            "Topics appearing in more than 50% of papers are high-priority for exam preparation.",
            "End-term exams typically have broader coverage than mid-term assessments."
        ],
        studyRecommendations=[
            f"Focus on frequently tested topics: {', '.join(frequently_tested[:3]) if frequently_tested else 'review all chapters'}.",
            "Practice previous year papers under timed conditions for better exam readiness.",
            "Review answer schemes for subjective questions to understand expected depth.",
            "Group similar topics together while studying to see conceptual connections."
        ],
        totalPapersAnalyzed=n
    )


# ════════════════════════════════════════════════════════════════════════════════
# FEATURE 9: AI EMAIL & NOTIFICATION GENERATOR (upgraded from Phase 8 stub)
# ════════════════════════════════════════════════════════════════════════════════

class NoticeRequest(BaseModel):
    prompt: str
    audience: str = "students"
    noticeType: Optional[str] = "GENERAL"

class NoticeResponse(BaseModel):
    title: str
    body: str
    summary: str

@app.post("/generate-notice", response_model=NoticeResponse)
async def generate_notice(req: NoticeRequest):
    """
    Feature 9: AI Email & Notification Generator.
    Turns a Faculty's short prompt into a professionally formatted notice.
    """
    if not AI_ENABLED:
        return NoticeResponse(
            title=req.prompt.split(":")[0].strip() if ":" in req.prompt else "Notice",
            body=f"Dear {req.audience.title()},\n\n{req.prompt}\n\nPlease note this important communication and act accordingly.\n\nRegards,\nFaculty",
            summary=req.prompt[:120] + ("..." if len(req.prompt) > 120 else ""),
        )

    system_prompt = (
        "You are a professional college administrator drafting official notices. "
        "Given a short prompt from a faculty member, generate a well-formatted official notice. "
        f"The notice is for: {req.audience}. Notice type: {req.noticeType}. "
        "Return ONLY a JSON object with exactly three keys: "
        "\"title\" (string, concise heading), "
        "\"body\" (string, full notice text with proper salutation and sign-off, use \\n for line breaks), "
        "\"summary\" (string, one sentence summary of key action/date). "
        "Do not include markdown code fences or any text outside the JSON."
    )

    try:
        content = await call_llm(system_prompt, f"Audience: {req.audience}\nPrompt: {req.prompt}", max_tokens=800)
        parsed = json.loads(content)
        return NoticeResponse(
            title=parsed.get("title", "Notice"),
            body=parsed.get("body", req.prompt),
            summary=parsed.get("summary", req.prompt[:120]),
        )
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI response parsing failed: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"AI API error: {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"AI service unreachable: {str(e)}")
