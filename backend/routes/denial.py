"""
RCM Copilot — Denial Explainer API Route
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from services.denial_agent import explain_denial_code, generate_appeal_letter

router = APIRouter()


class DenialRequest(BaseModel):
    code: str = Field(..., description="The denial code to explain, e.g. CO-4, PR-96")


class AppealLetterRequest(BaseModel):
    code: str = Field(..., description="The denial code")
    patient_name: Optional[str] = "[Patient Name]"
    claim_number: Optional[str] = "[Claim Number]"
    insurance_company: Optional[str] = "[Insurance Company]"
    provider_name: Optional[str] = "[Provider Name]"
    date_of_service: Optional[str] = "[Date of Service]"
    additional_context: Optional[str] = ""


@router.post("/explain")
def explain_denial(request: DenialRequest):
    """Explain a denial code using AI (Groq/LLaMA 3 via Agno)."""
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Denial code cannot be empty")

    try:
        result = explain_denial_code(request.code.strip().upper())
        return {
            "code": request.code.strip().upper(),
            "explanation": result,
            "status": "success",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/appeal-letter")
def generate_appeal(request: AppealLetterRequest):
    """Generate a professional appeal letter for a denied claim."""
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Denial code cannot be empty")

    try:
        letter = generate_appeal_letter(
            code=request.code.strip().upper(),
            patient_name=request.patient_name,
            claim_number=request.claim_number,
            insurance_company=request.insurance_company,
            provider_name=request.provider_name,
            date_of_service=request.date_of_service,
            additional_context=request.additional_context,
        )
        return {
            "code": request.code.strip().upper(),
            "letter": letter,
            "status": "success",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
