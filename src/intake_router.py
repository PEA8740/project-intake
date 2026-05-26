"""
AquaForge regAssist — Intake Questionnaire API Router
Endpoint: GET /intake/schema
Returns the canonical YAML merged with the requested locale (en / fr).
"""

from fastapi import APIRouter, HTTPException, Query
from functools import lru_cache
from pathlib import Path
import yaml

router = APIRouter(prefix="/intake", tags=["intake"])

# ── Paths (adjust to your project layout) ─────────────────────────────────────
BASE_DIR      = Path(__file__).resolve().parent.parent
CANONICAL     = BASE_DIR / "config" / "intake" / "water_project_intake_v2.canonical.yaml"
LOCALE_DIR    = BASE_DIR / "config" / "intake" / "locale"
SUPPORTED_LOCALES = {"en", "fr"}

# ── YAML loaders (cached — files are read once per process) ───────────────────
@lru_cache(maxsize=1)
def _load_canonical() -> dict:
    if not CANONICAL.exists():
        raise FileNotFoundError(f"Canonical YAML not found: {CANONICAL}")
    with CANONICAL.open(encoding="utf-8") as f:
        return yaml.safe_load(f)

@lru_cache(maxsize=len(SUPPORTED_LOCALES))
def _load_locale(lang: str) -> dict:
    path = LOCALE_DIR / f"project_intake_v2.{lang}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Locale file not found: {path}")
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)

# ── Merge logic ───────────────────────────────────────────────────────────────
def _merge_schema(canonical: dict, locale: dict) -> dict:
    """
    Merges structural data (canonical) with UI labels (locale).
    For each question: adds label, help, placeholder from locale.
    For each option: adds label from locale.
    Returns a fully hydrated schema ready for the frontend.
    """
    locale_questions = locale.get("questions", {})
    locale_ui        = locale.get("ui", {})
    locale_steps     = locale.get("step_labels", {})
    locale_location  = locale.get("location_ui", {})

    merged_questions = []

    for question in canonical.get("questions", []):
        qid      = question["id"]
        q_locale = locale_questions.get(qid, {})

        merged_q = {
            **question,
            "label":       q_locale.get("label", qid),
            "help":        q_locale.get("help", ""),
            "placeholder": q_locale.get("placeholder", ""),
        }

        # Merge option labels
        if "options" in question:
            opt_locale = q_locale.get("options", {})
            merged_options = []
            for opt in question["options"]:
                oid = opt["id"]
                merged_options.append({
                    **opt,
                    "label": opt_locale.get(oid, oid),
                })
            merged_q["options"] = merged_options

        # Add group labels for questions that have them (axis A/B)
        if "group_labels" in q_locale:
            merged_q["group_labels"] = q_locale["group_labels"]

        merged_questions.append(merged_q)

    return {
        "id":                  canonical.get("id"),
        "version":             canonical.get("version"),
        "domain":              canonical.get("domain"),
        "status":              canonical.get("status"),
        "locale":              locale.get("locale"),
        "ui":                  locale_ui,
        "step_labels":         locale_steps,
        "location_ui":         locale_location,
        "condition_operators": canonical.get("condition_operators", []),
        "question_types":      canonical.get("question_types", []),
        "questions":           merged_questions,
    }

# ── Endpoint ──────────────────────────────────────────────────────────────────
@router.get(
    "/schema",
    summary="Get intake questionnaire schema",
    description=(
        "Returns the fully hydrated intake questionnaire schema: "
        "canonical structure merged with UI labels for the requested locale. "
        "Supported locales: en, fr."
    ),
)
def get_intake_schema(
    lang: str = Query(
        default="en",
        description="Locale code — 'en' (English) or 'fr' (French)",
        pattern="^[a-z]{2}$",
    )
):
    if lang not in SUPPORTED_LOCALES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported locale '{lang}'. Supported: {sorted(SUPPORTED_LOCALES)}",
        )

    try:
        canonical = _load_canonical()
        locale    = _load_locale(lang)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return _merge_schema(canonical, locale)


@router.post(
    "/submit",
    summary="Submit intake questionnaire answers",
    description=(
        "Receives the completed intake answers, builds the project classification "
        "object, and returns the regulatory scope for downstream regAssist processing."
    ),
)
def submit_intake(answers: dict):
    """
    Receives:  { question_id: answer_value, ... }
    Returns:   { classification: {...}, project: {...}, regulatory_scope: {...} }
    """
    classification = _build_classification(answers)
    return {
        "status":          "received",
        "classification":  classification,
        "regulatory_scope": {
            "note": "Regulatory mapping pending — pass classification to regAssist engine."
        },
    }

# ── Classification builder ────────────────────────────────────────────────────
def _build_classification(answers: dict) -> dict:
    """
    Maps flat answers dict to nested classification object
    using the writes_to paths defined in the canonical YAML.
    Example: writes_to = 'classification.water_families'
             → result['classification']['water_families'] = answer_value
    """
    canonical = _load_canonical()
    result    = {}

    for question in canonical.get("questions", []):
        qid       = question["id"]
        writes_to = question.get("writes_to", "")
        answer    = answers.get(qid)

        if answer is None or writes_to == "":
            continue

        keys = writes_to.split(".")
        node = result
        for key in keys[:-1]:
            node = node.setdefault(key, {})
        node[keys[-1]] = answer

    return result
