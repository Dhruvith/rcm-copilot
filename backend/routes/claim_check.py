"""
RCM Copilot — Claim Checker API Route
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from services.rules_engine import validate_claim

router = APIRouter()


class ClaimCheckRequest(BaseModel):
    icd_codes: List[str] = Field(..., description="List of ICD-10 diagnosis codes")
    cpt_code: str = Field(..., description="CPT procedure code")
    modifiers: Optional[List[str]] = Field(default=[], description="List of modifiers")
    patient_dob: Optional[str] = Field(default=None, description="Patient DOB (YYYY-MM-DD)")
    patient_gender: Optional[str] = Field(default=None, description="Patient gender: M or F")
    date_of_service: Optional[str] = Field(default=None, description="Date of service (YYYY-MM-DD)")
    provider_npi: Optional[str] = Field(default=None, description="Provider NPI (10 digits)")
    billed_amount: Optional[float] = Field(default=None, description="Billed amount in dollars")


@router.post("/validate")
def check_claim(request: ClaimCheckRequest):
    """Run pre-submission validation on a claim."""
    try:
        claim_data = {
            "icd_codes": request.icd_codes,
            "cpt_code": request.cpt_code,
            "modifiers": request.modifiers or [],
            "patient_dob": request.patient_dob,
            "patient_gender": request.patient_gender,
            "date_of_service": request.date_of_service,
            "provider_npi": request.provider_npi,
            "billed_amount": request.billed_amount,
        }
        result = validate_claim(claim_data)
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")
