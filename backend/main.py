"""
RCM Copilot — Main FastAPI Application
AI-Powered Claim Assistant for Healthcare Revenue Cycle Management
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.denial import router as denial_router
from routes.claim_check import router as claim_router
from routes.analytics import router as analytics_router

app = FastAPI(
    title="RCM Copilot API",
    description="AI-Powered Claim Assistant — Denial Explainer, Claim Checker, Analytics & Appeal Letters",
    version="1.0.0",
)

# CORS — Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, you may want to restrict this to your actual Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(denial_router, prefix="/denial", tags=["Denial Explainer"])
app.include_router(claim_router, prefix="/claim", tags=["Claim Checker"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])


@app.get("/")
def root():
    return {
        "message": "🏥 RCM Copilot API is running!",
        "version": "1.0.0",
        "endpoints": {
            "denial_explain": "POST /denial/explain",
            "appeal_letter": "POST /denial/appeal-letter",
            "claim_validate": "POST /claim/validate",
            "analytics_upload": "POST /analytics/upload",
        },
    }
