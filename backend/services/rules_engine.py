"""
RCM Copilot — Claims Rule Engine
Rule-based pre-submission claim validation
"""

import re
from datetime import datetime
from services.icd_validator import validate_icd10_code


# Common CPT code patterns (simplified for demo — real systems use full CMS DB)
VALID_CPT_PATTERNS = [
    (r"^99[2-4]\d{2}$", "E/M (Evaluation & Management)"),
    (r"^[1-6]\d{4}$", "Surgical/Medical Procedures"),
    (r"^7\d{4}$", "Radiology"),
    (r"^8\d{4}$", "Pathology/Lab"),
    (r"^9[0-8]\d{3}$", "Medicine"),
    (r"^0\d{4}[A-Z]?$", "Category III / New Codes"),
]

# Known incompatible CPT-ICD combinations (simplified examples)
INCOMPATIBLE_COMBOS = [
    {"cpt_prefix": "992", "icd_prefix": "Z00", "reason": "Preventive visit codes should use preventive E/M CPTs (99381-99397)"},
]

# Gender-specific ICD codes
MALE_ONLY_ICD_PREFIXES = ["N40", "N41", "N42", "N43", "N44", "N45", "N46", "N47", "N48", "N49", "N50", "N51"]
FEMALE_ONLY_ICD_PREFIXES = ["N70", "N71", "N72", "N73", "N74", "N75", "N76", "N77", "O0", "O1", "O2", "O3", "O4", "O5", "O6", "O7", "O8", "O9"]

# Common modifiers
VALID_MODIFIERS = ["25", "26", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
                   "76", "77", "78", "79", "80", "81", "82", "AS", "LT", "RT", "TC",
                   "XE", "XP", "XS", "XU", "GY", "GA", "KX"]


def validate_claim(claim_data: dict) -> dict:
    """
    Run all validation rules on a claim and return results.
    
    Expected claim_data keys:
    - icd_codes: list of ICD-10 diagnosis codes
    - cpt_code: CPT procedure code
    - modifiers: list of modifiers (optional)
    - patient_dob: patient date of birth (optional, YYYY-MM-DD)
    - patient_gender: M or F (optional)
    - date_of_service: date of service (YYYY-MM-DD)
    - provider_npi: NPI number (optional)
    - billed_amount: dollar amount (optional)
    """
    results = []
    overall_pass = True

    # Rule 1: Validate ICD-10 codes
    icd_codes = claim_data.get("icd_codes", [])
    if not icd_codes:
        results.append({
            "rule": "ICD-10 Diagnosis Code Required",
            "status": "FAIL",
            "severity": "critical",
            "message": "At least one ICD-10 diagnosis code is required.",
            "fix": "Add a valid ICD-10 diagnosis code for the patient's condition."
        })
        overall_pass = False
    else:
        for code in icd_codes:
            validation = validate_icd10_code(code)
            if validation["valid"]:
                results.append({
                    "rule": f"ICD-10 Code Validation: {code}",
                    "status": "PASS",
                    "severity": "info",
                    "message": f"✅ {code} — {validation['description']}",
                    "fix": None
                })
            else:
                results.append({
                    "rule": f"ICD-10 Code Validation: {code}",
                    "status": "FAIL",
                    "severity": "critical",
                    "message": f"'{code}' is not a valid ICD-10 code.",
                    "fix": f"Check the code and correct it. Suggestions: {[s['code'] for s in validation.get('suggestions', [])]}"
                })
                overall_pass = False

    # Rule 2: Validate CPT code format
    cpt_code = claim_data.get("cpt_code", "").strip()
    if not cpt_code:
        results.append({
            "rule": "CPT Procedure Code Required",
            "status": "FAIL",
            "severity": "critical",
            "message": "A CPT procedure code is required.",
            "fix": "Add the correct CPT code for the procedure performed."
        })
        overall_pass = False
    else:
        cpt_valid = False
        cpt_category = ""
        for pattern, category in VALID_CPT_PATTERNS:
            if re.match(pattern, cpt_code):
                cpt_valid = True
                cpt_category = category
                break

        if cpt_valid:
            results.append({
                "rule": f"CPT Code Validation: {cpt_code}",
                "status": "PASS",
                "severity": "info",
                "message": f"✅ {cpt_code} — Format valid ({cpt_category})",
                "fix": None
            })
        else:
            results.append({
                "rule": f"CPT Code Validation: {cpt_code}",
                "status": "WARN",
                "severity": "warning",
                "message": f"'{cpt_code}' may not be a standard CPT code format.",
                "fix": "Verify this CPT code against the current AMA CPT codebook."
            })

    # Rule 3: Check CPT-ICD compatibility
    if cpt_code and icd_codes:
        for combo in INCOMPATIBLE_COMBOS:
            if cpt_code.startswith(combo["cpt_prefix"]):
                for icd in icd_codes:
                    if icd.upper().startswith(combo["icd_prefix"]):
                        results.append({
                            "rule": "CPT-ICD Compatibility Check",
                            "status": "WARN",
                            "severity": "warning",
                            "message": f"Potential mismatch: CPT {cpt_code} with ICD {icd}.",
                            "fix": combo["reason"]
                        })

    # Rule 4: Modifier validation
    modifiers = claim_data.get("modifiers", [])
    if modifiers:
        for mod in modifiers:
            mod = mod.strip().upper()
            if mod in VALID_MODIFIERS:
                results.append({
                    "rule": f"Modifier Validation: {mod}",
                    "status": "PASS",
                    "severity": "info",
                    "message": f"✅ Modifier {mod} is recognized.",
                    "fix": None
                })
            else:
                results.append({
                    "rule": f"Modifier Validation: {mod}",
                    "status": "WARN",
                    "severity": "warning",
                    "message": f"Modifier '{mod}' is not in the common modifiers list.",
                    "fix": "Verify this modifier is correct for this procedure."
                })

    # Rule 5: Date of service validation
    dos = claim_data.get("date_of_service", "")
    if dos:
        try:
            dos_date = datetime.strptime(dos, "%Y-%m-%d")
            if dos_date > datetime.now():
                results.append({
                    "rule": "Date of Service Check",
                    "status": "FAIL",
                    "severity": "critical",
                    "message": "Date of service is in the future.",
                    "fix": "Correct the date of service — it cannot be a future date."
                })
                overall_pass = False
            elif (datetime.now() - dos_date).days > 365:
                results.append({
                    "rule": "Timely Filing Check",
                    "status": "WARN",
                    "severity": "warning",
                    "message": "Date of service is over 1 year ago — may exceed timely filing limits.",
                    "fix": "Check the payer's timely filing deadline. Most payers require submission within 90-365 days."
                })
            else:
                results.append({
                    "rule": "Date of Service Check",
                    "status": "PASS",
                    "severity": "info",
                    "message": f"✅ Date of service {dos} is valid.",
                    "fix": None
                })
        except ValueError:
            results.append({
                "rule": "Date of Service Format",
                "status": "FAIL",
                "severity": "critical",
                "message": "Date of service must be in YYYY-MM-DD format.",
                "fix": "Correct the date format to YYYY-MM-DD."
            })
            overall_pass = False

    # Rule 6: NPI validation (basic format check)
    npi = claim_data.get("provider_npi", "")
    if npi:
        if re.match(r"^\d{10}$", npi):
            results.append({
                "rule": "NPI Format Check",
                "status": "PASS",
                "severity": "info",
                "message": f"✅ NPI {npi} has valid format (10 digits).",
                "fix": None
            })
        else:
            results.append({
                "rule": "NPI Format Check",
                "status": "FAIL",
                "severity": "critical",
                "message": "NPI must be exactly 10 digits.",
                "fix": "Enter a valid 10-digit NPI number."
            })
            overall_pass = False

    # Rule 7: Billed amount check
    amount = claim_data.get("billed_amount")
    if amount is not None:
        try:
            amt = float(amount)
            if amt <= 0:
                results.append({
                    "rule": "Billed Amount Check",
                    "status": "FAIL",
                    "severity": "critical",
                    "message": "Billed amount must be greater than $0.",
                    "fix": "Enter the correct billed amount."
                })
                overall_pass = False
            elif amt > 100000:
                results.append({
                    "rule": "Billed Amount Check",
                    "status": "WARN",
                    "severity": "warning",
                    "message": f"Billed amount ${amt:,.2f} is unusually high — verify.",
                    "fix": "Double-check the billed amount for accuracy."
                })
            else:
                results.append({
                    "rule": "Billed Amount Check",
                    "status": "PASS",
                    "severity": "info",
                    "message": f"✅ Billed amount ${amt:,.2f} is within normal range.",
                    "fix": None
                })
        except (ValueError, TypeError):
            results.append({
                "rule": "Billed Amount Check",
                "status": "FAIL",
                "severity": "critical",
                "message": "Billed amount must be a valid number.",
                "fix": "Enter a valid dollar amount."
            })
            overall_pass = False

    # Rule 8: Gender-specific diagnosis check
    gender = claim_data.get("patient_gender", "").upper()
    if gender and icd_codes:
        for code in icd_codes:
            code_upper = code.upper()
            if gender == "M":
                for prefix in FEMALE_ONLY_ICD_PREFIXES:
                    if code_upper.startswith(prefix):
                        results.append({
                            "rule": "Gender-Diagnosis Mismatch",
                            "status": "FAIL",
                            "severity": "critical",
                            "message": f"ICD code {code} is typically female-only but patient gender is Male.",
                            "fix": "Verify diagnosis code and patient gender are correct."
                        })
                        overall_pass = False
            elif gender == "F":
                for prefix in MALE_ONLY_ICD_PREFIXES:
                    if code_upper.startswith(prefix):
                        results.append({
                            "rule": "Gender-Diagnosis Mismatch",
                            "status": "FAIL",
                            "severity": "critical",
                            "message": f"ICD code {code} is typically male-only but patient gender is Female.",
                            "fix": "Verify diagnosis code and patient gender are correct."
                        })
                        overall_pass = False

    # Summary
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    warnings = sum(1 for r in results if r["status"] == "WARN")

    return {
        "overall_status": "PASS" if overall_pass and warnings == 0 else ("WARN" if overall_pass else "FAIL"),
        "summary": {
            "total_rules": total,
            "passed": passed,
            "failed": failed,
            "warnings": warnings,
        },
        "results": results,
    }
