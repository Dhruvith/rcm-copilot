import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the backend directory is in the path for Vercel's serverless runtime
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from routes.denial import router as denial_router
from routes.claim_check import router as claim_router

app = FastAPI(
    title="RCM Copilot API",
    description="AI-Powered Claim Assistant — Denial Explainer, Claim Checker & Appeal Letters",
    version="1.0.0",
    root_path="/api"  # Important for Vercel routing
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



@app.get("/")
def root():
    return {
        "message": "🏥 RCM Copilot API is running!",
        "version": "1.0.0",
        "endpoints": {
            "denial_explain": "POST /denial/explain",
            "appeal_letter": "POST /denial/appeal-letter",
            "claim_validate": "POST /claim/validate",

        },
    }
