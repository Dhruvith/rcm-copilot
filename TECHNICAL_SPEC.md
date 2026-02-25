# RCM Copilot — Technical Specification & Implementation Reference

> **Version:** 1.0.0 | **Last Updated:** February 24, 2026  
> AI-Powered Claim Assistant for US Healthcare Revenue Cycle Management

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Backend — Tech Spec & Implementation Logic](#5-backend--tech-spec--implementation-logic)
   - 5.1 [FastAPI Application Entry Point](#51-fastapi-application-entry-point)
   - 5.2 [Denial Agent Service](#52-denial-agent-service)
   - 5.3 [ICD-10 Validator Service](#53-icd-10-validator-service)
   - 5.4 [Rules Engine Service](#54-rules-engine-service)
   - 5.5 [Denial Routes](#55-denial-routes)
   - 5.6 [Claim Check Route](#56-claim-check-route)
   - 5.7 [Analytics Route](#57-analytics-route)
6. [Frontend — Tech Spec & Implementation Logic](#6-frontend--tech-spec--implementation-logic)
   - 6.1 [Entry Point & Routing](#61-entry-point--routing)
   - 6.2 [App Shell & Navigation](#62-app-shell--navigation)
   - 6.3 [Denial Explainer Page](#63-denial-explainer-page)
   - 6.4 [Claim Checker Page](#64-claim-checker-page)
   - 6.5 [Analytics Page](#65-analytics-page)
   - 6.6 [Appeal Letter Generator Page](#66-appeal-letter-generator-page)
   - 6.7 [Design System (CSS)](#67-design-system-css)
7. [API Contract Reference](#7-api-contract-reference)
8. [Core Business Logic Deep-Dive](#8-core-business-logic-deep-dive)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Environment & Configuration](#10-environment--configuration)
11. [Dependencies Reference](#11-dependencies-reference)
12. [Running the Application](#12-running-the-application)

---

## 1. Project Overview

**RCM Copilot** is a full-stack, AI-powered tool built for healthcare billing teams working in the US Revenue Cycle Management (RCM) space. It targets a real, well-documented industry problem:

- **$262 billion** in US healthcare claims are denied annually
- **65%** of denials are never appealed
- **73%** of properly-appealed claims are overturned

The application provides four core capabilities:

| Feature | What It Does |
|---|---|
| **Denial Code Explainer** | Takes any payer denial code (CARC/RARC) and uses an LLM to explain it, give root causes, fix steps, and appeal success rates |
| **Pre-Submission Claim Checker** | Runs 8 deterministic rule-based validations on claim data before it ever reaches the payer |
| **Denial Pattern Analytics** | Accepts a CSV of denied claims, runs statistical analysis, and returns charts + an AI executive summary |
| **Appeal Letter Generator** | Produces a professional, ready-to-send appeal letter in markdown using AI, customized with patient/claim details |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19)                      │
│    Vite Dev Server @ http://localhost:5173                      │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────┐ │
│  │  Denial      │  │  Claim       │  │  Analytics │  │ Letter│ │
│  │  Explainer   │  │  Checker     │  │  (Recharts)│  │  Gen  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └───┬───┘ │
│         │                 │                │              │     │
│         └─────────────────┴────────────────┴──────────────┘     │
│                              axios (HTTP)                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API (JSON / multipart)
                               │ CORS: localhost:5173 ↔ localhost:8000
┌──────────────────────────────▼──────────────────────────────────┐
│                    BACKEND (FastAPI + Uvicorn)                   │
│                @ http://localhost:8000                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      main.py (App Root)                    │ │
│  │        CORS Middleware → Router Registration               │ │
│  └──────────────┬─────────────────┬──────────────┬─────────────┘ │
│                 │                 │               │              │
│        /denial  │    /claim       │  /analytics   │              │
│  ┌──────▼──────┐ │  ┌──────▼─────┐ │ ┌──────▼────┐ │             │
│  │ denial.py   │ │  │claim_check │ │ │analytics  │ │             │
│  │ (Router)    │ │  │.py (Router)│ │ │.py(Router)│ │             │
│  └──────┬──────┘ │  └──────┬─────┘ │ └──────┬────┘ │             │
│         │        │         │       │        │       │             │
│  ┌──────▼──────────────────────────────────────────┐             │
│  │               SERVICES LAYER                    │             │
│  │  ┌──────────────────────┐  ┌──────────────┐    │             │
│  │  │   denial_agent.py    │  │ rules_engine │    │             │
│  │  │   (Agno + Groq LLM)  │  │    .py       │    │             │
│  │  └──────────┬───────────┘  └──────┬───────┘    │             │
│  │             │                     │            │             │
│  │             │              ┌──────▼──────────┐ │             │
│  │             │              │ icd_validator.py │ │             │
│  │             │              │ (simple-icd-10) │ │             │
│  │             │              └─────────────────┘ │             │
│  └─────────────┼────────────────────────────────  ┘             │
│                │                                                 │
│  ┌─────────────▼──────────────────┐                             │
│  │     Groq Cloud API             │                             │
│  │  LLaMA 3.3 70B Versatile       │                             │
│  └────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

**Communication Pattern:**
- Frontend → Backend: HTTP REST via `axios` with JSON bodies (or `multipart/form-data` for file uploads)
- Backend → AI: Agno framework calls Groq REST API using `GROQ_API_KEY` from `.env`
- ICD-10 Validation: **100% offline** using the `simple-icd-10` Python library (no external call)

---

## 3. Technology Stack

### Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Web framework | **FastAPI** | 0.129.2 | REST API, routing, request validation |
| ASGI server | **Uvicorn** | 0.41.0 | Serves the FastAPI app |
| AI framework | **Agno** | 2.5.3 | Agent orchestration wrapper around LLM providers |
| LLM provider | **Groq (Python SDK)** | 1.0.0 | Client for Groq Cloud (LLaMA 3.3 70B) |
| Data model | **Pydantic** | 2.12.5 | Request/response schema validation |
| Config | **pydantic-settings** | 2.13.1 | Settings management |
| Env loading | **python-dotenv** | 1.2.1 | Load `.env` file at startup |
| Data processing | **pandas** | 3.0.1 | CSV parsing and analytics in the analytics route |
| ICD-10 Database | **simple-icd-10** | 2.1.1 | Offline ICD-10 code validation library |
| File handling | **python-multipart** | 0.0.22 | Enables `UploadFile` in FastAPI |

### Frontend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| UI framework | **React** | 19.2.4 | Component model, state management |
| Build tool | **Vite** | 7.3.1 | Dev server, HMR, bundling |
| React plugin | **@vitejs/plugin-react** | 5.1.4 | JSX transform and React refresh |
| HTTP client | **axios** | 1.13.5 | REST API calls to FastAPI backend |
| Router | **react-router-dom** | 7.13.0 | *(installed but navigation uses custom `useState` switch)* |
| Charts | **Recharts** | 3.7.0 | Bar chart and Pie chart in Analytics page |
| Language | **TypeScript** (dev dep) | 5.9.3 | Type-checking support (tsconfig present) |
| Styling | **Vanilla CSS** | — | Custom design system in `index.css` |
| Font | **Inter** (Google Fonts) | — | Primary typeface |

### Infrastructure / AI

| Component | Detail |
|---|---|
| LLM Model | **LLaMA 3.3 70B Versatile** via Groq Cloud |
| Auth | Single `GROQ_API_KEY` in `.env` |
| ICD-10 dataset | Bundled inside `simple-icd-10` package (offline) |

---

## 4. Directory Structure

```
rcm-copilot/
│
├── backend/
│   ├── .env                       # GROQ_API_KEY (secret, not committed)
│   ├── main.py                    # FastAPI app root — CORS + router registration
│   ├── requirements.txt           # All Python dependencies
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── denial.py              # POST /denial/explain + POST /denial/appeal-letter
│   │   ├── claim_check.py         # POST /claim/validate
│   │   └── analytics.py           # POST /analytics/upload
│   │
│   └── services/
│       ├── __init__.py
│       ├── denial_agent.py        # Agno agent + explain_denial_code() + generate_appeal_letter()
│       ├── icd_validator.py       # validate_icd10_code() using simple-icd-10
│       └── rules_engine.py        # validate_claim() — 8 deterministic rules
│
├── frontend/
│   ├── index.html                 # HTML shell — loads Inter font, mounts #root
│   ├── package.json               # npm config + dependency list
│   ├── vite.config.js             # Vite config — React plugin, port 5173
│   ├── tsconfig.json              # TypeScript config
│   │
│   └── src/
│       ├── main.jsx               # React DOM root render
│       ├── App.jsx                # App shell — sidebar layout + page routing (useState)
│       ├── index.css              # Full design system (1008 lines, CSS vars + components)
│       │
│       ├── pages/
│       │   ├── DenialExplainer.jsx    # Denial code input + AI result display
│       │   ├── ClaimChecker.jsx       # Multi-field claim form + rule result list
│       │   ├── Analytics.jsx          # CSV drag-drop upload + Recharts + AI summary
│       │   └── LetterGenerator.jsx    # Appeal letter form + rendered output + copy/download
│       │
│       └── components/                # (empty — all components are co-located in pages)
│
└── TECHNICAL_SPEC.md              # ← this file
```

---

## 5. Backend — Tech Spec & Implementation Logic

### 5.1 FastAPI Application Entry Point

**File:** `backend/main.py`

**Purpose:** Bootstraps the entire API. Creates the FastAPI app instance, applies CORS middleware, and registers the three route modules.

**Key implementation decisions:**

```python
app = FastAPI(
    title="RCM Copilot API",
    description="...",
    version="1.0.0",
)
```

**CORS Policy:**
```python
allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```
Only the local Vite dev server is whitelisted. In production this list would include the deployed frontend URL.

**Router prefixes:**
| Router | Prefix | Tag |
|---|---|---|
| `denial_router` | `/denial` | Denial Explainer |
| `claim_router` | `/claim` | Claim Checker |
| `analytics_router` | `/analytics` | Analytics |

**Health check endpoint:** `GET /` — returns JSON confirming the API is running plus the list of endpoint paths.

---

### 5.2 Denial Agent Service

**File:** `backend/services/denial_agent.py`

**Purpose:** The AI brain of the application. Creates a persistent **Agno `Agent`** instance powered by **Groq's LLaMA 3.3 70B Versatile** model, and exposes two public functions.

#### Agent Configuration

```python
denial_agent = Agent(
    model=Groq(id="llama-3.3-70b-versatile"),
    description="Expert medical billing specialist (CPC) with 15+ years RCM experience...",
    instructions=[
        "1. Code Meaning — CMS/X12 official meaning",
        "2. Common Causes — top 3-5 real-world reasons",
        "3. Fix Steps — exact billing team actions",
        "4. Prevention Tips — how to avoid recurrence",
        "5. Appeal Success Rate — estimated %",
    ],
    markdown=True,
)
```

The agent is instantiated **once at module load time** and reused across all requests. This is important — it avoids re-initialization overhead on every API call.

The `description` field is the **system prompt** persona: it positions the LLM as an experienced CPC-certified medical billing specialist with knowledge of CARC/RARC codes, CMS standards, and US insurance processes.

`markdown=True` tells Agno to expect and pass through markdown-formatted responses.

#### `explain_denial_code(code: str) → str`

Constructs a **structured prompt** with five explicit section headers (using emoji anchors for the AI to fill in):

```
## 📋 Code Meaning  →  what the code means officially
## 🔍 Common Causes  →  top real-world billing reasons
## 🛠️ Step-by-Step Fix  →  what the billing team should do
## 🛡️ Prevention Tips  →  how to avoid in future
## 📊 Appeal Success Rate  →  estimated success %
```

The code is **always uppercased** before being sent (enforced in the route layer).

Returns `response.content` (the raw markdown string from the LLM).

#### `generate_appeal_letter(code, patient_name, claim_number, insurance_company, provider_name, date_of_service, additional_context) → str`

Constructs a letter-generation prompt with these seven variables injected. The prompt instructs the AI to produce:

1. Professional letterhead with placeholders
2. Clearly stated appeal reason
3. Reference to policy guidelines and medical necessity
4. Reconsideration request with rationale
5. Persuasive but professional tone
6. Attachment placeholder section
7. Closing and signature block — all in **markdown format**

All optional fields default to bracket placeholders (e.g., `[Patient Name]`) if not provided by the user.

---

### 5.3 ICD-10 Validator Service

**File:** `backend/services/icd_validator.py`

**Purpose:** Validates ICD-10 diagnosis codes **completely offline** using the `simple-icd-10` library, which embeds the full ICD-10-CM code set.

#### `validate_icd10_code(code: str) → dict`

**Input:** Raw string (case-insensitive, whitespace-trimmed internally)

**Logic flow:**

```
1. Strip + uppercase the code
2. Call icd.is_valid_item(code) → True/False
3. If VALID:
   - Get description via icd.get_description(code)
   - Get parent category via icd.get_parent(code)
   - Get up to 10 child subcodes via icd.get_children(code)
   - Return full enriched dict
4. If INVALID:
   - Call _suggest_similar_codes(code)
   - Return invalid dict with suggestions
```

**Return schema (valid):**
```json
{
  "valid": true,
  "code": "J06.9",
  "description": "Acute upper respiratory infection, unspecified",
  "category": "J06",
  "category_description": "Acute upper respiratory infections of multiple...",
  "subcodes": [{"code": "...", "description": "..."}]
}
```

**Return schema (invalid):**
```json
{
  "valid": false,
  "code": "J06X",
  "description": null,
  "message": "'J06X' is not a valid ICD-10 code.",
  "suggestions": [{"code": "J06", "description": "..."}]
}
```

#### `_suggest_similar_codes(code: str) → list`

Three-strategy suggestion algorithm when a code fails validation:

| Strategy | What it tries | Example |
|---|---|---|
| Remove dot | If code has `.`, try without it | `J06.9` → `J069` |
| Add dot | If code has no `.` and is >3 chars, try inserting `.` after char 3 | `J069` → `J06.9` |
| Category fallback | Try just the first 3 characters | `J069X` → `J06` |

---

### 5.4 Rules Engine Service

**File:** `backend/services/rules_engine.py`

**Purpose:** Implements deterministic, rule-based pre-submission claim validation. **Does not call any AI or external service.** Runs 8 sequential validation rules and returns a structured report.

#### Static Data Tables

| Table | Contents |
|---|---|
| `VALID_CPT_PATTERNS` | 6 regex patterns covering E/M, Surgical, Radiology, Pathology, Medicine, Category III codes |
| `INCOMPATIBLE_COMBOS` | Known bad CPT+ICD combos (e.g., regular E/M code with preventive-visit ICD prefix `Z00`) |
| `MALE_ONLY_ICD_PREFIXES` | ICD-10 prefixes N40–N51 (male genitourinary conditions) |
| `FEMALE_ONLY_ICD_PREFIXES` | ICD-10 prefixes N70–N77, O0–O9 (female reproductive / obstetric) |
| `VALID_MODIFIERS` | 31 standard CPT modifier codes (25, 26, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 76, 77, 78, 79, 80, 81, 82, AS, LT, RT, TC, XE, XP, XS, XU, GY, GA, KX) |

#### `validate_claim(claim_data: dict) → dict`

**Input dict keys:**

| Key | Type | Required |
|---|---|---|
| `icd_codes` | `list[str]` | Yes |
| `cpt_code` | `str` | Yes |
| `modifiers` | `list[str]` | No |
| `patient_dob` | `str (YYYY-MM-DD)` | No |
| `patient_gender` | `str (M/F)` | No |
| `date_of_service` | `str (YYYY-MM-DD)` | No |
| `provider_npi` | `str` | No |
| `billed_amount` | `float` | No |

#### The 8 Validation Rules

| Rule # | Rule Name | Severity | Logic |
|---|---|---|---|
| **1** | ICD-10 Diagnosis Code Required | `critical` | Calls `validate_icd10_code()` for each code. FAIL if list empty or any code invalid |
| **2** | CPT Procedure Code Required | `critical` / `warning` | Regex-matches CPT against 6 pattern groups. FAIL if empty, WARN if format not recognized |
| **3** | CPT-ICD Compatibility Check | `warning` | Checks `INCOMPATIBLE_COMBOS` table for known bad pairings |
| **4** | Modifier Validation | `warning` | Checks each modifier against `VALID_MODIFIERS` list |
| **5** | Date of Service Check | `critical` / `warning` | FAIL if future date or wrong format; WARN if >365 days ago (timely filing risk) |
| **6** | NPI Format Check | `critical` | Regex `^\d{10}$` — must be exactly 10 digits |
| **7** | Billed Amount Check | `critical` / `warning` | FAIL if ≤$0 or non-numeric; WARN if >$100,000 |
| **8** | Gender-Diagnosis Mismatch | `critical` | Cross-references gender with MALE_ONLY and FEMALE_ONLY ICD prefix lists |

**Result object per rule:**
```json
{
  "rule": "NPI Format Check",
  "status": "FAIL",       // PASS | FAIL | WARN
  "severity": "critical", // critical | warning | info
  "message": "NPI must be exactly 10 digits.",
  "fix": "Enter a valid 10-digit NPI number."
}
```

**Final return:**
```json
{
  "overall_status": "PASS",   // PASS | WARN | FAIL
  "summary": {
    "total_rules": 7,
    "passed": 6,
    "failed": 0,
    "warnings": 1
  },
  "results": [...]
}
```

**`overall_status` logic:**
- `FAIL` — if any single rule results in FAIL (`overall_pass = False`)
- `WARN` — if all rules pass but there are warnings
- `PASS` — all rules pass, zero warnings

---

### 5.5 Denial Routes

**File:** `backend/routes/denial.py`

**Two endpoints:**

#### `POST /denial/explain`

**Request body (Pydantic `DenialRequest`):**
```json
{ "code": "CO-4" }
```

**Implementation steps:**
1. Validate code is non-empty string (raises HTTP 400 if blank)
2. Strip whitespace + uppercase the code
3. Call `explain_denial_code(code)` from `denial_agent.py`
4. Return JSON with `code`, `explanation` (markdown string), `status: "success"`

**Error handling:** Any exception from the AI service raises HTTP 500.

---

#### `POST /denial/appeal-letter`

**Request body (Pydantic `AppealLetterRequest`):**
```json
{
  "code": "CO-4",
  "patient_name": "Sarah Johnson",        // optional, defaults to "[Patient Name]"
  "claim_number": "CLM-2026-00847",       // optional
  "insurance_company": "Blue Cross",      // optional
  "provider_name": "Dr. Chen",            // optional
  "date_of_service": "2026-02-15",        // optional
  "additional_context": "..."             // optional
}
```

**Implementation steps:**
1. Validate code is non-empty (HTTP 400 if blank)
2. Strip + uppercase code
3. Call `generate_appeal_letter(...)` from `denial_agent.py` with all context fields
4. Return JSON with `code`, `letter` (markdown string), `status: "success"`

---

### 5.6 Claim Check Route

**File:** `backend/routes/claim_check.py`

**One endpoint:**

#### `POST /claim/validate`

**Request body (Pydantic `ClaimCheckRequest`):**
```json
{
  "icd_codes": ["J06.9", "R05.9"],
  "cpt_code": "99213",
  "modifiers": ["25"],
  "patient_dob": null,
  "patient_gender": "F",
  "date_of_service": "2026-02-20",
  "provider_npi": "1234567890",
  "billed_amount": 150.00
}
```

**Implementation steps:**
1. Construct `claim_data` dict from validated Pydantic model fields
2. Call `validate_claim(claim_data)` from `rules_engine.py`
3. Spread result into response with `status: "success"` key prepended
4. Any exception raises HTTP 500

---

### 5.7 Analytics Route

**File:** `backend/routes/analytics.py`

**One endpoint:**

#### `POST /analytics/upload`

**Request:** `multipart/form-data` — a CSV file upload

**Full implementation pipeline:**

```python
Step 1: File validation
  → Must end in .csv or .CSV (HTTP 400 if not)

Step 2: CSV parsing
  → await file.read() → pandas.read_csv(BytesIO)
  → HTTP 400 if empty or unparseable

Step 3: Column normalization
  → df.columns.str.strip().str.lower().str.replace(" ", "_")

Step 4: Denial code column detection (flexible)
  → Searches for: denial_code, code, reason_code, carc, denial
  → HTTP 400 if none found (also tells user what columns were found)

Step 5: Optional column detection
  → Department: department, dept, doctor, provider, physician
  → Amount: amount, billed_amount, charge, total

Step 6: Statistical analysis
  → Top 10 denial codes (value_counts)
  → Department breakdown top 10 (if dept column found)
  → Financial stats: total, avg, max, min (if amount column found)
  → Total denials count + unique code count

Step 7: AI summary prompt construction
  → Embeds stats into structured prompt
  → Asks LLM for: executive summary (2-3 sentences), #1 issue, 2 action items

Step 8: AI call
  → denial_agent.run(ai_prompt)
  → Falls back to "AI analysis unavailable" string if exception

Step 9: Return full response JSON
```

**Response shape:**
```json
{
  "status": "success",
  "total_denials": 15,
  "unique_codes": 8,
  "top_denial_codes": [{"code": "CO-4", "count": 4}, ...],
  "department_breakdown": [{"department": "Cardiology", "denial_count": 5}, ...],
  "financial_impact": {
    "total_denied_amount": 20610.50,
    "average_denial_amount": 1374.03,
    "max_denial": 3200.00,
    "min_denial": 420.00
  },
  "ai_summary": "## Executive Summary\n..."
}
```

---

## 6. Frontend — Tech Spec & Implementation Logic

### 6.1 Entry Point & Routing

**`frontend/index.html`**: Standard Vite HTML shell. Preconnects to Google Fonts, loads **Inter** typeface (weights 300–900), sets viewport meta, mounts `<div id="root">`, and imports `/src/main.jsx` as a module.

**`frontend/src/main.jsx`**: Calls `ReactDOM.createRoot(document.getElementById('root')).render(<App />)`.

**Navigation model**: The application uses **React `useState`** (not `react-router-dom`) for page switching. The `activePage` state string determines which page component is rendered inside `<main>`. This is a SPA with no URL routing.

---

### 6.2 App Shell & Navigation

**File:** `frontend/src/App.jsx`

**State:**
```js
const [activePage, setActivePage] = useState("home"); // active route
const [sidebarOpen, setSidebarOpen] = useState(false); // mobile toggle
```

**Navigation items config:**
```js
const NAV_ITEMS = [
  { id: "home",     label: "Dashboard",       icon: "🏠" },
  { id: "denial",   label: "Denial Explainer", icon: "🔍", badge: "AI" },
  { id: "claim",    label: "Claim Checker",    icon: "✅" },
  { id: "analytics",label: "Analytics",        icon: "📊" },
  { id: "letter",   label: "Appeal Letters",   icon: "📝", badge: "AI" },
];
```

**Page rendering (`renderPage`):** A `switch` on `activePage` returns the appropriate page component. `home` renders the inline `<HomePage>` component.

**HomePage component:** Shows industry stats (hardcoded: $262B, 65% never appealed, 73% win rate) and four clickable feature cards that each call `onNavigate(pageId)`.

**Layout structure (CSS Grid):**
```
┌──────────(280px)──────┬──────────(flex-1)────────────┐
│ sidebar (fixed)        │ main-content (margin-left)   │
│  - Logo + branding     │  - Active page component     │
│  - Navigation items    │                              │
│  - "Powered by" footer │                              │
└────────────────────────┴──────────────────────────────┘
```

Mobile: sidebar slides off-screen (`transform: translateX(-100%)`) and a hamburger `☰` button toggles it. A semi-transparent overlay closes it on click.

---

### 6.3 Denial Explainer Page

**File:** `frontend/src/pages/DenialExplainer.jsx`

**State:**
```js
const [code, setCode] = useState("");
const [result, setResult] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

**Key features:**

1. **Quick-example chips**: 10 pre-set denial codes (`CO-4`, `PR-96`, `CO-97`, `CO-16`, `OA-23`, `CO-45`, `PR-1`, `CO-29`, `PI-94`, `CO-252`) render as clickable buttons that both set the input value AND immediately trigger the API call (`handleSubmit(c)` with the code passed directly to avoid stale state).

2. **Enter key support**: `onKeyDown` handler fires `handleSubmit()` on Enter key.

3. **`handleSubmit(denialCode?)`**: Takes an optional param to support the quick-chip direct calls. Uses `denialCode || code` (covers both cases).

4. **API call:** `POST /denial/explain` with `{ code: codeToUse }` via axios.

5. **`MarkdownRenderer` component**: Custom, lightweight markdown-to-JSX converter (no external library). Parses the AI markdown response line-by-line:
   - `# / ## / ###` → `<h1>`, `<h2>`, `<h3>`
   - `- ` / `* ` lines → `<ul><li>`
   - `1. ` numbered lines → `<ol><li>`
   - `---` → `<hr>`
   - `> ` lines → `<blockquote>`
   - Inline: `**bold**` → `<strong>`, `*italic*` → `<em>`, `` `code` `` → `<code>`
   - Uses `dangerouslySetInnerHTML` for inline formatting only
   - `flushList()` closes any open list before starting a new block type

---

### 6.4 Claim Checker Page

**File:** `frontend/src/pages/ClaimChecker.jsx`

**Form state fields:**
```js
{
  icd_codes: "",        // comma-separated string → split on submit
  cpt_code: "",
  modifiers: "",        // comma-separated string → split on submit
  patient_gender: "",   // "M" | "F" | "" (select dropdown)
  date_of_service: "",  // date input → YYYY-MM-DD native
  provider_npi: "",
  billed_amount: "",    // number input → parseFloat on submit
}
```

**Payload transformation on submit:**
```js
icd_codes: form.icd_codes.split(",").map(c => c.trim()).filter(Boolean)
modifiers: form.modifiers.split(",").map(m => m.trim()).filter(Boolean)
billed_amount: form.billed_amount ? parseFloat(form.billed_amount) : null
```

**Load Example button**: Populates all fields with realistic demo data (ICD codes `J06.9`, `R05.9`; CPT `99213`; modifier `25`; female; NPI `1234567890`; `$150.00`).

**Result display:**
- Overall status badge (PASS/WARN/FAIL) at the top
- 4 summary stat boxes (Total Rules / Passed / Failed / Warnings)
- Scrollable list of individual rule results with left-border color coding:
  - Green border = PASS
  - Red border = FAIL
  - Yellow border = WARN
- Each item shows rule name, message, and (if FAIL/WARN) a `💡 Fix:` tip

**Submit button** is disabled until both `icd_codes` and `cpt_code` have content.

---

### 6.5 Analytics Page

**File:** `frontend/src/pages/Analytics.jsx`

**State:**
```js
const [result, setResult] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [dragOver, setDragOver] = useState(false);
const [fileName, setFileName] = useState(null);
const fileRef = useRef(null); // hidden file input ref
```

**Upload methods (two supported):**
1. **Click-to-browse**: Clicking the upload zone triggers `fileRef.current.click()` → hidden `<input type="file" accept=".csv">`
2. **Drag-and-drop**: `onDrop` handler extracts `e.dataTransfer.files[0]` and calls `uploadFile()`

**`uploadFile(file)` function:**
1. Reset all state
2. Set `fileName` for the loading message
3. Build `FormData` with the file appended as `"file"` key
4. `POST /analytics/upload` with `Content-Type: multipart/form-data`

**Sample CSV download**: Built-in 15-row sample CSV is hardcoded as a string, converted to a `Blob`, and downloaded via a programmatically-created `<a>` element. Includes columns: `denial_code`, `department`, `amount`, `date`.

**Charts rendered (Recharts):**

| Chart | Component | Data | Styling |
|---|---|---|---|
| Top Denial Codes | `BarChart` | `top_denial_codes[{code, count}]` | Multi-color bars via `CHART_COLORS`, rounded tops `radius={[6,6,0,0]}` |
| Denials by Department | `PieChart` + `Pie` | `department_breakdown[{department, denial_count}]` | Donut style (`innerRadius={50}`), labeled |

Both charts use a **custom `CustomTooltip`** component styled to match the dark theme (dark glass card with indigo border).

**AI Summary**: Rendered using the same `MarkdownRenderer` component as DenialExplainer.

**Chart color palette** (10 colors, cycling): `#6366f1`, `#8b5cf6`, `#a78bfa`, `#818cf8`, `#7c3aed`, `#c084fc`, `#60a5fa`, `#34d399`, `#fbbf24`, `#f87171`

---

### 6.6 Appeal Letter Generator Page

**File:** `frontend/src/pages/LetterGenerator.jsx`

**Additional state:**
```js
const [copied, setCopied] = useState(false); // clipboard feedback state
```

**Form fields:**
```
code (required), patient_name, claim_number, insurance_company,
provider_name, date_of_service, additional_context (textarea)
```

**Post-generation actions:**

| Action | Implementation |
|---|---|
| **Copy to Clipboard** | `navigator.clipboard.writeText(result.letter)` → sets `copied=true` → resets after 2 seconds |
| **Download `.md`** | Creates `Blob` with `type: "text/markdown"` → programmatic `<a>` download → filename: `appeal_letter_{code}.md` |

**Load Example**: Pre-fills with realistic demo patient `Sarah Johnson`, claim `CLM-2026-00847`, insurer `Blue Cross Blue Shield`, provider `Dr. Michael Chen, MD`.

**Result display**: Full letter rendered via `MarkdownRenderer` inside a `result-container` glass card.

---

### 6.7 Design System (CSS)

**File:** `frontend/src/index.css` (1008 lines)

The CSS defines a **token-based design system** using CSS custom properties:

#### Color System
```css
/* Background tiers */
--bg-primary: #0a0e1a      /* Page background — deep navy */
--bg-secondary: #111827     /* Secondary surfaces */
--bg-card: rgba(17,24,39,0.7)  /* Card glass */
--bg-glass: rgba(255,255,255,0.03)  /* Subtle glass */

/* Accent — Indigo/Violet gradient */
--accent-primary: #6366f1
--accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)

/* Semantic */
--success: #34d399  (emerald green)
--warning: #fbbf24  (amber)
--error:   #f87171  (red)
--info:    #60a5fa  (blue)
```

#### Animated Background
A `body::before` pseudo-element creates a **static radial gradient mesh** (three overlapping ellipses of the accent color at very low opacity) giving depth to the background without performance cost.

#### Component Classes

| Class | Purpose |
|---|---|
| `.glass-card` | Frosted glass card with `backdrop-filter: blur(16px)` |
| `.input-field` | Unified input/textarea styling with indigo focus ring |
| `.btn-primary` | Gradient button with glow shadow and hover lift (`translateY(-1px)`) |
| `.btn-secondary` | Ghost button — subtle glass |
| `.status-badge.pass/fail/warn` | Pill badges with semantic colors |
| `.rule-item.pass/fail/warn` | Left-border-colored list items for validation results |
| `.summary-grid` | Auto-fit grid for stat boxes |
| `.upload-zone` | Dashed-border drag-drop zone (active state changes on `dragover`) |
| `.charts-grid` | Auto-fit grid for Recharts containers |
| `.spinner` | CSS border-top animation for loading states |
| `.animate-in` | `fadeSlideUp` keyframe animation for page transitions |

#### Animations
```css
@keyframes spin        { 0%→100%: rotate 360deg }
@keyframes fadeSlideUp { from: opacity 0, translateY(16px) → to: opacity 1, translateY(0) }
@keyframes pulse       { 0%/100%: opacity 1 → 50%: opacity 0.5 }
```

#### Responsive (Mobile)
At `max-width: 768px`:
- Sidebar becomes **off-canvas** (`transform: translateX(-100%)`) and slides in via the `.open` class
- `mobile-toggle` hamburger button becomes visible
- `main-content` loses its left margin
- Form grids collapse to single column

---

## 7. API Contract Reference

### Base URL
```
http://localhost:8000
```

### Endpoints Summary

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/` | — | Health check JSON |
| `POST` | `/denial/explain` | `{ "code": "CO-4" }` | `{ code, explanation, status }` |
| `POST` | `/denial/appeal-letter` | `AppealLetterRequest` | `{ code, letter, status }` |
| `POST` | `/claim/validate` | `ClaimCheckRequest` | `{ status, overall_status, summary, results }` |
| `POST` | `/analytics/upload` | `multipart/form-data` (CSV) | `{ status, total_denials, unique_codes, top_denial_codes, department_breakdown, financial_impact, ai_summary }` |

### HTTP Error Codes Used

| Code | When |
|---|---|
| `400` | Empty/invalid input, wrong file type, unparseable CSV, missing required column |
| `500` | AI service failure (Groq API error, invalid key, network timeout) |

---

## 8. Core Business Logic Deep-Dive

### How Denial Code Explanation Works (End-to-End)

```
User types "CO-4" and clicks Explain
→ Frontend DenialExplainer.jsx
   → handleSubmit("CO-4")
      → setLoading(true), reset state
      → axios.POST http://localhost:8000/denial/explain { code: "CO-4" }

Backend FastAPI receives request
→ routes/denial.py: explain_denial(request)
   → Validates code non-empty
   → Uppercases: "CO-4" (already uppercase)
   → Calls services/denial_agent.py: explain_denial_code("CO-4")

denial_agent.py:
   → Constructs 5-section structured prompt:
      "Explain CO-4... ## 📋 Code Meaning ... ## 🔍 Common Causes ..."
   → denial_agent.run(prompt)
      → Agno wraps this as a user message to LLaMA 3.3 70B on Groq Cloud
      → System prompt: "Expert CPC medical billing specialist..."
      → LLM generates markdown response (typically 400-800 tokens)
   → Returns response.content (markdown string)

→ Route returns: { code: "CO-4", explanation: "## 📋 Code Meaning\n...", status: "success" }

Frontend receives response
→ setResult(response.data)
→ setLoading(false)
→ Renders <MarkdownRenderer content={result.explanation} />
   → Parses markdown line-by-line → returns React JSX element tree
→ User sees structured AI explanation with headers, bullets
```

---

### How Claim Validation Works (End-to-End)

```
User fills form and clicks "Validate Claim"
→ ClaimChecker.jsx: handleSubmit(e)
   → Splits comma-separated strings: "J06.9, R05.9" → ["J06.9", "R05.9"]
   → axios.POST /claim/validate with structured payload

Backend:
→ routes/claim_check.py: check_claim(request)
   → Builds claim_data dict
   → Calls rules_engine.validate_claim(claim_data)

rules_engine.py: runs 8 rules sequentially →

Rule 1 (ICD-10): For each code in ["J06.9", "R05.9"]:
   → icd_validator.validate_icd10_code("J06.9")
      → simple_icd_10.is_valid_item("J06.9") → True
      → Gets description, parent, subcodes
   → Appends PASS result

Rule 2 (CPT "99213"):
   → Regex match against VALID_CPT_PATTERNS
   → r"^99[2-4]\d{2}$" matches "99213" → E/M category → PASS

Rule 3 (Compatibility):
   → "99213" doesn't start with "992" + "J06" doesn't start with "Z00" → no match → no result

Rule 4 (Modifier "25"):
   → "25" is in VALID_MODIFIERS list → PASS

Rule 5 (Date "2026-02-20"):
   → Parse with strptime → not future → not >365 days old → PASS

Rule 6 (NPI "1234567890"):
   → re.match(r"^\d{10}$") → 10 digits → PASS

Rule 7 (Amount $150.00):
   → 150.0 > 0, 150.0 < 100000 → PASS

Rule 8 (Gender "F" + ICD ["J06.9", "R05.9"]):
   → Neither J06.9 nor R05.9 starts with male-only prefixes → PASS

Summary: total=7, passed=7, failed=0, warnings=0 → overall_status: "PASS"

Frontend renders:
→ ✅ All Checks Passed badge
→ Summary grid: 7 | 7 | 0 | 0
→ 7 green-bordered rule items
```

---

### How Analytics Works (End-to-End)

```
User drops CSV or clicks to upload
→ Analytics.jsx: uploadFile(file)
   → FormData with file
   → axios.POST /analytics/upload

Backend:
→ analytics.py: analyze_denials(file)
   → Reads bytes → pandas.read_csv
   → Normalizes column names (lowercase, underscores)
   → Finds "denial_code" column
   → value_counts() → top 10 codes
   → dept column value_counts() → top 10 departments
   → pd.to_numeric on amount col → sum/mean/max/min
   
   → AI prompt: "Total: 15, Unique codes: 8, Top: CO-4 (4x), PR-96 (3x)..."
   → denial_agent.run(prompt) → 2-3 sentence summary + 1 issue + 2 actions
   
→ Returns full JSON with stats + ai_summary

Frontend:
→ Renders summary stat boxes
→ <BarChart> with top codes
→ <PieChart> with department breakdown (if present)
→ <MarkdownRenderer> with AI executive summary
```

---

## 9. Data Flow Diagrams

### Denial Explainer Flow
```
[User Input] → [/denial/explain] → [denial_agent.run()] → [Groq API] → [LLaMA 3.3 70B]
     ↑                                                                          ↓
[MarkdownRenderer] ← [result.explanation] ← [response.content (markdown)] ←───┘
```

### Claim Checker Flow
```
[Form Fields] → [/claim/validate] → [rules_engine.validate_claim()]
                                           ↓
                              [icd_validator for each ICD code]
                                           ↓
                              [8 sequential rule checks]
                                           ↓
                    [{ overall_status, summary, results[] }]
                                           ↓
                         [Rule items list rendered in UI]
```

### Analytics Flow
```
[CSV File] → [POST multipart/form-data] → [pandas.read_csv()]
                                                  ↓
                              [Column detect → value_counts() → financial stats]
                                                  ↓
                              [AI prompt with stats → denial_agent.run()]
                                                  ↓
                    [{ stats + charts_data + ai_summary }]
                                                  ↓
                    [Recharts BarChart + PieChart + MarkdownRenderer]
```

---

## 10. Environment & Configuration

### Backend `.env`
```env
GROQ_API_KEY=gsk_...   # Required — Groq Cloud API key
```

Loaded via `load_dotenv()` in `denial_agent.py` at import time. Passed implicitly to `Groq(id="llama-3.3-70b-versatile")` by the Agno/Groq SDK through the environment variable `GROQ_API_KEY`.

### Frontend API base URL
Hardcoded in each page file:
```js
const API_URL = "http://localhost:8000";
```

This is defined in **each of the four page components separately** (not a shared constant). Changing the backend URL requires updating all four files.

### Vite dev server
```js
// vite.config.js
server: { port: 5173 }
```

### CORS allowed origins (backend)
```python
allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"]
```

---

## 11. Dependencies Reference

### Python (backend/requirements.txt)
```
fastapi==0.129.2
uvicorn==0.41.0
agno==2.5.3
groq==1.0.0
python-dotenv==1.2.1
pandas==3.0.1
simple-icd-10==2.1.1
python-multipart==0.0.22
pydantic==2.12.5
pydantic-settings==2.13.1
```

### JavaScript (frontend/package.json)
**Dependencies:**
```json
"@vitejs/plugin-react": "^5.1.4",
"axios": "^1.13.5",
"react": "^19.2.4",
"react-dom": "^19.2.4",
"react-router-dom": "^7.13.0",
"recharts": "^3.7.0"
```

**Dev-dependencies:**
```json
"typescript": "~5.9.3",
"vite": "^7.3.1"
```

---

## 12. Running the Application

### Backend

```bash
cd backend

# (First time) Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux

# (First time) Install dependencies
pip install -r requirements.txt

# Set environment variable (or ensure .env exists with GROQ_API_KEY)

# Start the server
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`  
Interactive docs at: `http://localhost:8000/docs` (Swagger UI)

---

### Frontend

```bash
cd frontend

# (First time) Install dependencies
npm install

# Start dev server
npm run dev
```

App available at: `http://localhost:5173`

---

### Startup Order
1. Start **backend** first (port 8000)
2. Start **frontend** (port 5173)
3. Ensure `GROQ_API_KEY` in `backend/.env` is a valid Groq Cloud key

---

*End of Technical Specification*
