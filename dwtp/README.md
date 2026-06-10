# AquaForge regAssist — DWTP Intake Questionnaire

**Version:** 3.0  
**Status:** Demo — conference presentation  
**Live demo:** https://PEA8740.github.io/project-intake/dwtp/  
**Scope:** Drinking water treatment plant (DWTP) — process wastewater explicitly excluded  
**Parent repo:** [PEA8740/project-intake](https://github.com/PEA8740/project-intake)

---

## Context

This is a focused intake questionnaire for **drinking water production projects only**, built as a conference demo for the AquaForge regAssist platform. It is a scoped subset of the full `water_project_intake_v2` questionnaire, restricted to the `drinking_water_treatment` use case.

Process wastewater streams (filter backwash → `backwash_wastewater`, sedimentation sludge → `sludge`, membrane concentrate → `brine_concentrate`) are explicitly out of scope. These are handled separately in the full regAssist platform.

---

## Ontology Alignment

| Reference file | Version | Role |
|---|---|---|
| `ontology_canonical.yaml` | 0.2.0 | Canonical IDs — use_cases, subdomains, regulated_media, activities, compliance_points, obligation_types |
| `project_intake.canonical.yaml` | 0.2.2 | Structural conventions — writes_to, id: option convention, ontology_refs inline |
| `domain.yaml` | 0.3.0 | Domain config manifest — pipeline position |

All canonical IDs in `dwtp_intake_v3.canonical.yaml` are taken verbatim from `ontology_canonical.yaml v0.2.0`. No invented identifiers.

---

## File Structure

```
project-intake/
└── dwtp/
    ├── index.html                          ← Standalone demo (GitHub Pages)
    ├── README.md                           ← This file
    └── config/
        ├── plan_questions.md               ← Source of truth (content + design decisions)
        ├── dwtp_intake_v3.canonical.yaml   ← Machine-readable schema
        └── locale/
            └── dwtp_intake_v3.en-CA.yaml  ← English (Canada) UI labels
```

### File roles

**`plan_questions.md`** — Human-readable source of truth. Defines all questions, options, conditions, writes_to mappings, canonical references, and design decisions. This is the file to edit first when making changes.

**`dwtp_intake_v3.canonical.yaml`** — Machine-readable schema. Structure only: question IDs, types, conditions, writes_to paths, ontology_refs. No UI labels. Consumed by FastAPI backend (`intake_router.py`) and Claude Code generation.

**`dwtp_intake_v3.en-CA.yaml`** — English (Canada) UI labels, help text, placeholders, short_labels. Follows the `project_intake_en-CA.yaml` label style convention. Merged with canonical at runtime by the FastAPI schema endpoint.

**`index.html`** — Fully self-contained standalone demo. No external dependencies except CDN. Runs directly on GitHub Pages without a backend. All logic (conditions, classification builder, BUG-01 filtration exclusion) embedded in vanilla JS.

---

## Questionnaire Architecture

**6 steps, 34 questions total**

| Step | Key | Questions | Conditional |
|------|-----|-----------|-------------|
| 0 | location | GPS + confirm | — |
| 1 | project_characterization | 7 | 1 (industrial_sector) |
| 2 | raw_water_source | 6 | 2 (downstream_intake, source_regime) |
| 3 | raw_water_quality | 4 | — |
| 4 | treatment_train | 13 | 7 (coagulant, sedimentation, membrane config, MIT, NF/RO purpose, DBP) |
| 5 | regulatory_pipeline_output | 4 | — |

**Canonical pipeline output (on submit):**

```yaml
use_cases:         [drinking_water_treatment, ...]   # always + conditional
subdomains:        [drinking_water, ...]              # acceptance gate
regulated_media:   [source_water, raw_water, ...]
activities:        [abstraction, treatment, ...]
compliance_points: [raw_water_intake, ...]
obligation_types:  [treatment, design, monitoring, operational, reporting]
```

---

## Key Design Decisions

1. **discharge_type excluded** — No process wastewater discharge in scope. Conscious decision documented here and in `plan_questions.md`.
2. **water_families entry gate** — `drinking_water` pre-selected and locked, aligned with `project_intake.canonical.yaml` structure.
3. **writes_to on all questions** — All 34 questions carry `writes_to` paths for backend data model mapping.
4. **id: convention** — Option IDs use `id:` (not `value:`), aligned with `project_intake.canonical.yaml v0.2.2`.
5. **Capacity thresholds** — `micro < 10 m³/day`, `small 10–500`, `medium 500–10,000`, `large 10,000–100,000 m³/day`.
6. **downstream_drinking_water_intake** — Source water protection trigger, independent of discharge.
7. **sensitive_zones** — Raw water abstraction context, independent of discharge.
8. **BUG-01 (filtration mutual exclusion)** — `no_filtration` mutually exclusive with technology options. Enforced in UI via `filtExcl()`. Classification output: `filtration_technologies[]` + `no_filtration_flag`.

---

## Known Bugs Fixed

| ID | Severity | Description | Fix |
|----|----------|-------------|-----|
| BUG-01 | MAJOR | `no_filtration` not mutually exclusive with technology options | `filtExcl()` + `mutual_exclusion` in canonical |

---

## BUG-12 Candidates (Next Session)

These issues exist in the parent `water_project_intake_v2` and should be verified here when integrating:

- **BUG-12A** — UI question numbering vs canonical numbering
- **BUG-12B** — Context-sensitive labels for raw wastewater (not applicable to DWTP scope)
- **BUG-12C** — Sub-scope order follows canonical order, not user selection order

---

## Integration Notes

### FastAPI backend

When integrating with `intake_router.py` on GCP (`regassist-vm`, `us-central1-a`):

```
GET  /intake/schema?lang=en-CA&questionnaire=dwtp_intake_v3
      → returns merged canonical + locale schema

POST /intake/submit
      → validates answers, builds classification object, returns pipeline input
```

The classification object produced at submit maps directly to:
- `jurisdiction_discovery` stage input (jurisdictions + subdomains)
- `source_discovery` stage input (use_cases + activities)
- `artifact_classification` input (obligation_types + compliance_points)

### Ontology references

All `ontology_refs` in the canonical use IDs from `ontology_canonical.yaml v0.2.0`. When the ontology is updated, run a diff against canonical IDs to identify breaking changes.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | 2026-06-09 | writes_to on all questions; id: convention; capacity thresholds corrected; water_families + subscopes entry gate; downstream_drinking_water_intake added; sensitive_zones added; discharge_type excluded (conscious) |
| 2.0 | 2026-06-09 | Aligned with ontology_canonical v0.2.0; canonical_mapping block; use_case ≠ industry; abstraction_permit_status added; pipeline-ready classification output |
| 1.1 | 2026-06-08 | BUG-01 filtration mutual exclusion fix across all 4 files |
| 1.0 | 2026-06-08 | Initial build |

---

## Local Development

Files are at:
```
C:\Users\PEA8740\Documents\GitHub\project-intake\dwtp\
```

To validate YAML locally:
```powershell
python3 -c "import yaml; yaml.safe_load(open('config/dwtp_intake_v3.canonical.yaml'))"
python3 -c "import yaml; yaml.safe_load(open('config/locale/dwtp_intake_v3.en-CA.yaml'))"
```

To preview the demo locally, open `index.html` directly in a browser — no server required.
