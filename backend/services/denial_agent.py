"""
RCM Copilot — Denial Code Explainer Agent
Powered by Agno + Groq (LLaMA 3)
"""

import os
from agno.agent import Agent
from agno.models.groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Create the Agno agent powered by Groq LLaMA 3
denial_agent = Agent(
    model=Groq(id="llama-3.3-70b-versatile"),
    description=(
        "You are an expert medical billing specialist and certified coder (CPC) "
        "with 15+ years of experience in US healthcare Revenue Cycle Management (RCM). "
        "You have deep knowledge of CARC (Claim Adjustment Reason Codes), "
        "RARC (Remittance Advice Remark Codes), denial codes, insurance claim processes, "
        "and appeals procedures."
    ),
    instructions=[
        "When given a denial code, provide a comprehensive explanation covering:",
        "1. **Code Meaning** — What the denial code officially means per CMS/X12 standards",
        "2. **Common Causes** — The top 3-5 real-world reasons this denial occurs",
        "3. **Fix Steps** — Exact step-by-step actions the billing team should take to resolve it",
        "4. **Prevention Tips** — How to avoid this denial in future claims",
        "5. **Appeal Success Rate** — Estimated success rate if properly corrected and resubmitted",
        "Be specific, practical, and use simple language a billing team member can understand.",
        "Always format your response with clear markdown headers and bullet points.",
        "If the code is not a recognized denial code, say so and suggest similar valid codes.",
        "Include relevant CMS references or payer guidelines when applicable.",
    ],
    markdown=True,
)


def explain_denial_code(code: str) -> str:
    """Send a denial code to the Agno agent and return the AI explanation."""
    prompt = f"""
Explain this insurance claim denial code in full detail: **{code}**

Please cover ALL of the following sections:

## 📋 Code Meaning
What does {code} officially mean?

## 🔍 Common Causes
Top reasons why this denial happens in real billing scenarios.

## 🛠️ Step-by-Step Fix
Exact actions the billing team should take to fix and resubmit this claim.

## 🛡️ Prevention Tips
How to prevent this denial from happening on future claims.

## 📊 Appeal Success Rate
What is the estimated success rate if the claim is corrected and resubmitted properly?
    """
    response = denial_agent.run(prompt)
    return response.content


def generate_appeal_letter(code: str, patient_name: str = "[Patient Name]",
                           claim_number: str = "[Claim Number]",
                           insurance_company: str = "[Insurance Company]",
                           provider_name: str = "[Provider Name]",
                           date_of_service: str = "[Date of Service]",
                           additional_context: str = "") -> str:
    """Generate a professional appeal letter for a denied claim."""
    prompt = f"""
Generate a professional, ready-to-send appeal letter for the following denied claim:

- **Denial Code:** {code}
- **Patient Name:** {patient_name}
- **Claim Number:** {claim_number}
- **Insurance Company:** {insurance_company}
- **Provider/Facility:** {provider_name}
- **Date of Service:** {date_of_service}
- **Additional Context:** {additional_context if additional_context else "None provided"}

The letter should:
1. Be professionally formatted with proper letterhead placeholders
2. Clearly state the reason for appeal
3. Reference specific policy guidelines and medical necessity
4. Include a request for reconsideration with supporting rationale
5. Be persuasive but professional
6. Include placeholders for attachments (medical records, etc.)
7. End with appropriate closing and signature block

Format the letter in markdown.
    """
    response = denial_agent.run(prompt)
    return response.content
