from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import os
import json
import httpx

app = FastAPI(title="Collego AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 9: LLM API key — leave blank for local dev (returns structured stub)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = os.getenv("AI_MODEL", "openai/gpt-4o-mini")


# ==================== Health Check ====================

@app.get("/health")
async def health_check():
    return {
        "status": "UP",
        "service": "collego-ai-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_enabled": bool(OPENROUTER_API_KEY),
    }


# ==================== Models ====================

class NoticeRequest(BaseModel):
    prompt: str            # Faculty's short prompt / draft
    audience: str = "students"


class NoticeResponse(BaseModel):
    title: str
    body: str
    summary: str


# ==================== Phase 9 Feature: AI Notice / Email Generator ====================

@app.post("/generate-notice", response_model=NoticeResponse)
async def generate_notice(req: NoticeRequest):
    """
    Phase 9: AI Email & Notification Generator (Plan item #9).
    Turns a Faculty's short prompt into a formatted notice.

    - If OPENROUTER_API_KEY is set: calls LLM to generate a proper notice.
    - Otherwise: returns a graceful stub (safe for local dev and Phase 8 wiring).

    Called by FacultyPortalService.draftNotice() when enhance=true.
    """
    if not OPENROUTER_API_KEY:
        # Graceful stub for local dev / when no API key configured
        return NoticeResponse(
            title=req.prompt.split(":")[0].strip() if ":" in req.prompt else "Notice",
            body=req.prompt,
            summary=req.prompt[:120] + ("..." if len(req.prompt) > 120 else ""),
        )

    system_prompt = (
        "You are a professional college administrator writing official notices. "
        "Given a short prompt from a faculty member, generate a well-formatted notice. "
        "Return ONLY a JSON object with exactly three keys: "
        "\"title\" (string, concise heading), "
        "\"body\" (string, full notice text with proper salutation and sign-off), "
        "\"summary\" (string, one sentence summary). "
        "Do not include markdown code fences or any text outside the JSON."
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                OPENROUTER_BASE_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://65-0-244-196.sslip.io",
                    "X-Title": "Collego ERP",
                },
                json={
                    "model": DEFAULT_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Audience: {req.audience}\nPrompt: {req.prompt}"},
                    ],
                    "response_format": {"type": "json_object"},
                    "max_tokens": 800,
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
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
