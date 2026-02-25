"""
RCM Copilot — ICD-10 Code Validator
Uses the simple-icd-10 library for offline validation
"""

import simple_icd_10 as icd


def validate_icd10_code(code: str) -> dict:
    """Validate an ICD-10 code and return details."""
    code = code.strip().upper()

    try:
        is_valid = icd.is_valid_item(code)
    except Exception:
        is_valid = False

    if is_valid:
        try:
            description = icd.get_description(code)
        except Exception:
            description = "Description not available"

        try:
            parent = icd.get_parent(code)
            parent_desc = icd.get_description(parent) if parent else None
        except Exception:
            parent = None
            parent_desc = None

        try:
            children = icd.get_children(code)
            children_list = []
            for child in children[:10]:  # Limit to 10
                try:
                    children_list.append({
                        "code": str(child),
                        "description": icd.get_description(child)
                    })
                except Exception:
                    children_list.append({"code": str(child), "description": ""})
        except Exception:
            children_list = []

        return {
            "valid": True,
            "code": code,
            "description": description,
            "category": str(parent) if parent else None,
            "category_description": parent_desc,
            "subcodes": children_list,
        }
    else:
        # Try to suggest similar codes
        suggestions = _suggest_similar_codes(code)
        return {
            "valid": False,
            "code": code,
            "description": None,
            "message": f"'{code}' is not a valid ICD-10 code.",
            "suggestions": suggestions,
        }


def _suggest_similar_codes(code: str) -> list:
    """Try to find similar valid codes."""
    suggestions = []
    # Try with/without dot
    if "." in code:
        no_dot = code.replace(".", "")
        try:
            if icd.is_valid_item(no_dot):
                suggestions.append({
                    "code": no_dot,
                    "description": icd.get_description(no_dot)
                })
        except Exception:
            pass
    else:
        # Try adding dot after 3rd character
        if len(code) > 3:
            with_dot = code[:3] + "." + code[3:]
            try:
                if icd.is_valid_item(with_dot):
                    suggestions.append({
                        "code": with_dot,
                        "description": icd.get_description(with_dot)
                    })
            except Exception:
                pass

    # Try just the first 3 characters (category)
    if len(code) >= 3:
        category = code[:3]
        try:
            if icd.is_valid_item(category):
                suggestions.append({
                    "code": category,
                    "description": icd.get_description(category)
                })
        except Exception:
            pass

    return suggestions
