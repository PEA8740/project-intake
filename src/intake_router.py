"""
AquaForge regAssist — Intake Questionnaire API Router
File: intake_router.py
Version: 2.1.2

Changelog v2.0 → v2.1:
  BUG-03: classification maps new option IDs (direct_environmental_discharge,
          sewer_connection_discharge)
  BUG-05: Q15 label variant selected based on discharge_type in answers
  BUG-09: new option IDs (centralized_wwtp_operator,
          sewer_connection_indirect_discharge) recognized
  BUG-10: no_raw_water_abstraction recognized (renamed from no_water_intake)
  General: schema validation added to POST /intake/submit
           cache invalidation endpoint added for development

Changelog v2.1 → v2.1.2:
  BUG-12-A: No code change. Canonical ID vs UI counter distinction is a
            documentation/convention issue. See audit_questionnaire_v2.md.
  BUG-12-B: No code change. Label override for raw_wastewater (decentralized
            context) is a frontend rendering concern. The router returns the
            base label from locale; getLabelOverrides() in the frontend applies
            the contextual override. The locale file (en.yaml) now contains
            raw_wastewater_decentralized as an additional key.
  BUG-12-C: No code change. Sub-scope ordering by water_families selection order
            is a frontend rendering concern. The router returns questions in
            canonical schema order; visibleQ() / visibleQuestions() in the
            frontend sort subscopes using SUBSCOPE_FAMILY_MAP.
"""

from fastapi import APIRouter, HTTPException, Query
from functools import lru_cache
from pathlib import Path
from typing import Any
import yaml
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intake", tags=["intake"])

# ── File paths ─────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
CONFIG_DIR = BASE_DIR / "config" / "intake"

CANONICAL  = CONFIG_DIR / "water_project_intake_v2.canonical.yaml"
LOCALE_DIR = CONFIG_DIR / "locale"

SUPPORTED_LOCALES = {"en"}  # "fr" available but EN-only from v2.1 onward

# ── Q15 label variant keys (BUG-05) ───────────────────────────────────────────
# Q15 has two label variants in the locale file:
#   label_direct   → for projects with direct surface water discharge
#   label_indirect → for projects with indirect sewer discharge
# The router selects the appropriate label when merging.
INDIRECT_DISCHARGE_TYPES = {
    "indirect_sanitary_sewer",
    "indirect_storm_sewer",
}
DIRECT_DISCHARGE_TYPES = {
    "direct_surface_water",
    "direct_groundwater",
}
Q15_ID = "downstream_drinking_water_intake"


# ── YAML loaders (cached — files read once per process) ───────────────────────
@lru_cache(maxsize=1)
def _load_canonical() -> dict:
    if not CANONICAL.exists():
        raise FileNotFoundError(f"Canonical YAML not found: {CANONICAL}")
    with CANONICAL.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    logger.info(
        "Canonical schema loaded: %s v%s (%d questions)",
        data.get("id"), data.get("version"), len(data.get("questions", []))
    )
    return data


@lru_cache(maxsize=len(SUPPORTED_LOCALES))
def _load_locale(lang: str) -> dict:
    path = LOCALE_DIR / f"project_intake_v2.{lang}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Locale file not found: {path}")
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    logger.info("Locale file loaded: %s", path.name)
    return data


# ── Q15 label selection (BUG-05) ──────────────────────────────────────────────
def _select_q15_label(q_locale: dict, answers: dict | None = None) -> str:
    """
    Returns the appropriate Q15 label based on discharge_type answers.
    - Direct discharge  → label_direct
    - Indirect only     → label_indirect
    - Mixed / unknown   → label (generic fallback)
    answers is only available in the submit endpoint; GET /schema uses generic.
    """
    if not answers:
        return q_locale.get("label", Q15_ID)

    discharge = answers.get("discharge_type", [])
    if not isinstance(discharge, list):
        discharge = [discharge]

    has_direct   = any(d in DIRECT_DISCHARGE_TYPES   for d in discharge)
    has_indirect = any(d in INDIRECT_DISCHARGE_TYPES for d in discharge)

    if has_direct and not has_indirect:
        return q_locale.get("label_direct",   q_locale.get("label", Q15_ID))
    if has_indirect and not has_direct:
        return q_locale.get("label_indirect", q_locale.get("label", Q15_ID))
    return q_locale.get("label", Q15_ID)


# ── Schema merger ──────────────────────────────────────────────────────────────
def _merge_schema(
    canonical: dict,
    locale: dict,
    answers: dict | None = None,
) -> dict:
    """
    Merges canonical structure with locale labels.
    For each question: injects label, help, placeholder, group_labels.
    For each option: injects label.
    BUG-05: Q15 receives context-aware label when answers are provided.
    """
    locale_questions = locale.get("questions", {})
    merged_questions = []

    for question in canonical.get("questions", []):
        qid      = question["id"]
        q_locale = locale_questions.get(qid, {})

        # BUG-05: Q15 label selection
        if qid == Q15_ID:
            label = _select_q15_label(q_locale, answers)
        else:
            label = q_locale.get("label", qid)

        merged_q = {
            **question,
            "label":       label,
            "help":        q_locale.get("help", ""),
            "placeholder": q_locale.get("placeholder", ""),
        }

        # Merge option labels
        if "options" in question:
            opt_locale = q_locale.get("options", {})
            merged_q["options"] = [
                {**opt, "label": opt_locale.get(opt["id"], opt["id"])}
                for opt in question["options"]
            ]

        # Merge group labels (Axis A / Axis B headers for Q6)
        if "group_labels" in q_locale:
            merged_q["group_labels"] = q_locale["group_labels"]

        merged_questions.append(merged_q)

    return {
        "id":                  canonical.get("id"),
        "version":             canonical.get("version"),
        "domain":              canonical.get("domain"),
        "status":              canonical.get("status"),
        "locale":              locale.get("locale"),
        "ui":                  locale.get("ui", {}),
        "step_labels":         locale.get("step_labels", {}),
        "location_ui":         locale.get("location_ui", {}),
        "condition_operators": canonical.get("condition_operators", []),
        "question_types":      canonical.get("question_types", []),
        "questions":           merged_questions,
    }


# ── Classification builder ─────────────────────────────────────────────────────
def _build_classification(answers: dict) -> dict:
    """
    Maps flat answers dict to nested classification object
    using writes_to dot-notation paths from the canonical schema.

    Example:
      writes_to = "classification.water_families"
      → result["classification"]["water_families"] = answer_value

    Handles all renamed/new option IDs from v2.1:
      - no_raw_water_abstraction (was no_water_intake)
      - centralized_wwtp_operator (was centralized_wwtp)
      - sewer_connection_indirect_discharge (new)
      - food_service_establishment (new)
      - direct_environmental_discharge (new, split from discharge)
      - sewer_connection_discharge (new, split from discharge)
    """
    canonical = _load_canonical()
    result: dict[str, Any] = {}

    for question in canonical.get("questions", []):
        qid       = question["id"]
        writes_to = question.get("writes_to", "")
        answer    = answers.get(qid)

        if answer is None or writes_to == "":
            continue
        if isinstance(answer, list) and len(answer) == 0:
            continue
        if isinstance(answer, str) and answer == "":
            continue

        # Navigate / create nested dict from dot-notation path
        keys = writes_to.split(".")
        node = result
        for key in keys[:-1]:
            node = node.setdefault(key, {})
        node[keys[-1]] = answer

    return result


# ── Answer validation ──────────────────────────────────────────────────────────
def _validate_answers(answers: dict) -> list[str]:
    """
    Validates submitted answers against the canonical schema.
    Returns a list of validation error messages (empty = valid).
    Only validates required questions that are visible given the answers.
    """
    canonical = _load_canonical()
    errors: list[str] = []

    for question in canonical.get("questions", []):
        qid      = question["id"]
        required = question.get("required", False)
        req_if   = question.get("required_if")
        qtype    = question.get("type")

        # Skip optional and text_area questions
        if not required and not req_if:
            continue
        if qtype == "text_area":
            continue

        # Check visibility — skip if condition not met
        if req_if:
            visible = False
            if "any_selected" in req_if:
                cond   = req_if["any_selected"]
                parent = answers.get(cond["question"], [])
                if not isinstance(parent, list):
                    parent = [parent]
                visible = any(v in parent for v in cond["values"])
            elif "equals" in req_if:
                visible = answers.get(req_if["equals"]["question"]) == \
                          req_if["equals"]["value"]
            if not visible:
                continue

        # Validate
        answer = answers.get(qid)
        if answer is None or answer == "" or \
           (isinstance(answer, list) and len(answer) == 0):
            errors.append(f"Question '{qid}' is required but has no answer.")

    return errors


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.get(
    "/schema",
    summary="Get intake questionnaire schema",
    description=(
        "Returns the fully hydrated intake questionnaire schema: "
        "canonical structure merged with UI labels for the requested locale. "
        f"Supported locales: {', '.join(sorted(SUPPORTED_LOCALES))}."
    ),
)
def get_intake_schema(
    lang: str = Query(
        default="en",
        description="Locale code — 'en' (English)",
        pattern="^[a-z]{2}$",
    ),
) -> dict:
    if lang not in SUPPORTED_LOCALES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported locale '{lang}'. "
                f"Supported: {sorted(SUPPORTED_LOCALES)}"
            ),
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
        "Receives completed intake answers, validates them against the schema, "
        "builds the project classification object, and returns the regulatory "
        "scope for downstream regAssist engine processing."
    ),
)
def submit_intake(payload: dict) -> dict:
    """
    Expected payload:
    {
        "answers": { "question_id": answer_value, ... },
        "lang":    "en"
    }
    Returns:
    {
        "status":           "received",
        "version":          "0.2.1",
        "classification":   { ... },
        "validation_errors": [],
        "regulatory_scope": { ... }
    }
    """
    answers  = payload.get("answers", payload)  # backward compat
    lang     = payload.get("lang", "en")
    location = payload.get("location", {})  # BUG-11

    # BUG-11: validate location confirmation
    location = payload.get("location", {})
    if not location.get("confirmed", False):
        return {
            "status":            "location_required",
            "version":           _load_canonical().get("version", "0.2.1"),
            "classification":    {},
            "validation_errors": [
                "Project location must be confirmed before submission. "
                "Please enter a city or coordinates and click Confirm location."
            ],
            "regulatory_scope": {}
        }

    # Validate answers
    validation_errors = _validate_answers(answers)

    # Build classification object
    classification = _build_classification(answers)

    # BUG-05: resolve Q15 label for response metadata
    try:
        locale   = _load_locale(lang if lang in SUPPORTED_LOCALES else "en")
        q15_loc  = locale.get("questions", {}).get(Q15_ID, {})
        q15_label = _select_q15_label(q15_loc, answers)
    except Exception:
        q15_label = Q15_ID

    return {
        "status":            "received",
        "version":           _load_canonical().get("version", "0.2.1"),
        "classification":    classification,
        "validation_errors": validation_errors,
        "q15_label_used":    q15_label,
        "regulatory_scope": {
            "note": (
                "Regulatory mapping pending — pass classification to "
                "regAssist engine with jurisdiction context."
            )
        },
    }


@router.post(
    "/cache/clear",
    summary="Clear schema cache (development only)",
    description="Forces reload of canonical and locale YAML files from disk.",
    include_in_schema=False,  # hidden from Swagger UI in production
)
def clear_cache() -> dict:
    _load_canonical.cache_clear()
    _load_locale.cache_clear()
    logger.info("Schema cache cleared.")
    return {"status": "cache cleared"}


@router.get(
    "/health",
    summary="Intake router health check",
)
def health_check() -> dict:
    try:
        canonical = _load_canonical()
        return {
            "status":    "ok",
            "schema_id": canonical.get("id"),
            "version":   canonical.get("version"),
            "questions": len(canonical.get("questions", [])),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
