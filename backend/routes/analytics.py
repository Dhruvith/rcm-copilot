"""
RCM Copilot — Analytics API Route
CSV upload + denial pattern analysis
"""

import io
from fastapi import APIRouter, HTTPException, UploadFile, File
from services.denial_agent import denial_agent
import pandas as pd

router = APIRouter()


@router.post("/upload")
async def analyze_denials(file: UploadFile = File(...)):
    """
    Upload a CSV of denied claims and get pattern analysis.
    
    Expected CSV columns (flexible):
    - denial_code or code
    - department or doctor or provider (optional)
    - amount or billed_amount (optional)
    - date or date_of_service (optional)
    """
    if not file.filename.endswith((".csv", ".CSV")):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot parse CSV: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Try to find the denial code column
    code_col = None
    for col in ["denial_code", "code", "reason_code", "carc", "denial"]:
        if col in df.columns:
            code_col = col
            break

    if not code_col:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot find denial code column. Found columns: {list(df.columns)}. "
                   f"Please include a column named 'denial_code' or 'code'."
        )

    # Find optional columns
    dept_col = None
    for col in ["department", "dept", "doctor", "provider", "physician"]:
        if col in df.columns:
            dept_col = col
            break

    amount_col = None
    for col in ["amount", "billed_amount", "charge", "total"]:
        if col in df.columns:
            amount_col = col
            break

    # --- Analysis ---

    # 1. Top denial codes
    code_counts = df[code_col].value_counts().head(10)
    top_codes = [
        {"code": str(code), "count": int(count)}
        for code, count in code_counts.items()
    ]

    # 2. Department breakdown (if available)
    dept_breakdown = []
    if dept_col:
        dept_counts = df[dept_col].value_counts().head(10)
        dept_breakdown = [
            {"department": str(dept), "denial_count": int(count)}
            for dept, count in dept_counts.items()
        ]

    # 3. Financial impact (if amount column exists)
    financial = {}
    if amount_col:
        try:
            df[amount_col] = pd.to_numeric(df[amount_col], errors="coerce")
            financial = {
                "total_denied_amount": float(df[amount_col].sum()),
                "average_denial_amount": float(df[amount_col].mean()),
                "max_denial": float(df[amount_col].max()),
                "min_denial": float(df[amount_col].min()),
            }
        except Exception:
            financial = {}

    # 4. Summary stats
    total_denials = len(df)
    unique_codes = df[code_col].nunique()

    # 5. AI-powered summary
    top_codes_str = ", ".join([f"{c['code']} ({c['count']} times)" for c in top_codes[:5]])
    dept_str = ", ".join([f"{d['department']} ({d['denial_count']})" for d in dept_breakdown[:3]]) if dept_breakdown else "Not available"

    ai_prompt = f"""
Analyze these denial patterns from a healthcare facility and provide a brief executive summary:

Total denials: {total_denials}
Unique denial codes: {unique_codes}
Top denial codes: {top_codes_str}
Department breakdown: {dept_str}
{f"Total denied amount: ${financial.get('total_denied_amount', 0):,.2f}" if financial else ""}

Provide:
1. A brief executive summary (2-3 sentences)
2. The #1 most impactful issue to fix first
3. Two specific action items to reduce denials
Keep it concise and actionable.
    """

    try:
        ai_response = denial_agent.run(ai_prompt)
        ai_summary = ai_response.content
    except Exception:
        ai_summary = "AI analysis unavailable — please check your Groq API key."

    return {
        "status": "success",
        "total_denials": total_denials,
        "unique_codes": unique_codes,
        "top_denial_codes": top_codes,
        "department_breakdown": dept_breakdown,
        "financial_impact": financial,
        "ai_summary": ai_summary,
    }
