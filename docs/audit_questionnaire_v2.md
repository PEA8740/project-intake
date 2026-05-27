# Questionnaire Audit Report — AquaForge Intake v2
# Date: 2026-05-25
# Method: Simulation of 6 real project profiles

---

## TESTED PROFILES

| ID | Profile | Sector | Discharge type |
|----|---------|--------|----------------|
| P1 | Restaurant with grease trap / pretreatment | Institutional / Food service | Indirect — sanitary sewer |
| P2 | New municipal WWTP construction | Municipal | Direct — surface water |
| P3 | Drinking water treatment plant (DWTP) | Municipal | No discharge / partial closed loop |
| P4 | Petroleum refinery | Industrial | Direct + Indirect (mixed) |
| P5 | Decentralized septic system (rural) | Agricultural | Land application |
| P6 | Direct potable reuse system | Private utility | Reuse on-site |

---

## BUG CATALOGUE

---

### BUG-01 — Q17 Water streams: options not filtered by discharge type
**Severity: CRITICAL**
**Affected profiles: P1, P3, P5, P6**

**Problem:**
Q17 "What water streams are involved?" displays ALL options to ALL projects,
regardless of the discharge type selected in Q13.

**Concrete cases:**

P1 (restaurant → sanitary sewer):
- Sees "Raw wastewater (WWTP influent)" → INCORRECT
  A restaurant does not operate a WWTP. Its incoming stream is "process
  wastewater" (kitchen effluent), not "WWTP influent."
- Sees "Treated wastewater effluent (final effluent)" → INCORRECT
  There is no treated effluent — the discharge goes to the sewer,
  not to a natural receiving environment.
- Sees "Membrane concentrate / RO reject" → OUT OF SCOPE
  No membrane system in a standard restaurant.

P3 (DWTP — no wastewater discharge):
- Sees "Raw wastewater (WWTP influent)" → INCORRECT
  A DWTP treats raw water, not wastewater.
- Sees "Treated wastewater effluent" → INCORRECT
  A DWTP produces drinking water, not a WWTP effluent.

P5 (septic — land application):
- Sees "Membrane concentrate / RO reject" → OUT OF SCOPE
- Sees "Disinfection by-product streams" → unlikely for rural septic system

**Required fix:**
Add dynamic filtering of Q17 options based on the combination of
(water_families + discharge_type). Options must be shown only when
consistent with the project scope and discharge pathway.

**Filtering rules:**
- raw_wastewater → show only if municipal_wastewater OR industrial_wastewater selected
- treated_wastewater_effluent → show only if (municipal_wastewater OR industrial_wastewater)
  AND direct discharge or reuse selected
- membrane_concentrate_ro_reject → show only if drinking_water OR water_reuse
  OR industrial_wastewater selected
- filter_backwash_water → show only if drinking_water OR municipal_wastewater selected
- disinfection_byproduct_streams → show only if drinking_water OR municipal_wastewater
- industrial_process_water → show only if industrial_wastewater selected
- cooling_water → show only if industrial_wastewater selected OR power_generation sector

---

### BUG-02 — Q18 Project activities: options not filtered by scope
**Severity: CRITICAL**
**Affected profiles: P1, P3, P5**

**Problem:**
Q18 "What activities are part of this project?" displays all activities
without filtering based on the water scope selected in Q4 or the
water source selected in Q12.

**Concrete cases:**

P1 (restaurant → sewer, fed by municipal supply):
- Sees "Water abstraction / withdrawal" → INCORRECT
  A restaurant does not abstract raw water — it is supplied by the
  municipal distribution network.
- Sees "Treatment" → AMBIGUOUS
  The grease trap is pretreatment, not treatment in the regulatory sense.
  The distinction is critical for permit classification.
- Sees "Discharge" → MISLEADING
  The effluent goes to the sewer, not to a receiving environment.
  "Discharge" in regulatory vocabulary implies environmental release.
- Sees "Collection and conveyance (sewer network)" → INCORRECT
  The restaurant connects TO the sewer — it does not OPERATE a sewer network.
- Sees "Reuse" → OUT OF SCOPE for a standard restaurant.

P3 (DWTP):
- Sees "Collection and conveyance (sewer network)" → INCORRECT
  A DWTP does not operate a wastewater sewer network.

**Required fix:**
Filter Q18 options based on:
1. water_source_type: if municipal_supply only → hide water_abstraction_withdrawal
2. discharge_type: if indirect_sanitary_sewer only → hide discharge (environmental),
   relabel or hide collection_conveyance
3. water_families: if no municipal/industrial WW → hide collection_conveyance

**Filtering rules:**
- water_abstraction_withdrawal → hide if source = municipal_supply only
  (no raw water abstraction needed)
- collection_conveyance → show only if promoter operates network
  (municipal_wastewater + centralized_wwtp selected, OR drinking_water_distribution)
- discharge → split into:
  (a) Environmental discharge → show only if direct_surface_water or direct_groundwater
  (b) Sewer connection discharge → show only if indirect_sanitary_sewer or indirect_storm_sewer
- reuse → show only if water_reuse in water_families

---

### BUG-03 — "Discharge" terminology ambiguous: direct vs indirect conflated
**Severity: MAJOR**
**Affected profiles: P1, P4, P5**

**Problem:**
In Q18 (activities), the option "Discharge / release (effluent to receiving
environment or sewer)" conflates two regulatory opposites:
- Environmental discharge → triggers effluent quality standards and
  environmental permits (national/federal law)
- Sewer discharge → triggers municipal pretreatment program requirements
  (sewer use bylaws)

These two realities must NOT share the same option.

**Required fix:**
Split into two distinct options:
- "Environmental discharge — direct release to receiving environment"
- "Sewer connection — indirect discharge to municipal sewer system"

---

### BUG-04 — FSE / restaurant not guided toward correct regulatory scope
**Severity: MAJOR**
**Affected profiles: P1**

**Problem:**
A restaurant is classified "institutional" in Q1 (promoter type), but its
kitchen effluent (high FOG, BOD, TSS) is regulated as a food service
establishment (FSE) discharge in most jurisdictions — with specific
pretreatment standards distinct from general municipal wastewater regulations.

The questionnaire does not guide the user toward this specific sub-scope.
An engineer may check only "municipal_wastewater" which is incomplete —
FSE pretreatment regulations (grease interceptors, FOG programs) are a
distinct regulatory instrument in most jurisdictions.

**Required fix:**
Add a dedicated sub-scope in municipal_wastewater_subscopes:
- "Food service / commercial kitchen discharge to sewer (FOG / grease interceptor)"
  with ontology_refs: [food_service_establishment, fog_program, grease_interceptor]
And add clarifying help text in Q4 for institutional promoters.

---

### BUG-05 — Q15 Downstream intake: not asked for indirect discharge projects
**Severity: MAJOR**
**Affected profiles: P1, P4 (partial indirect)**

**Problem:**
Q15 "Is there a downstream drinking water intake?" is conditional only on
"direct_surface_water". It is not asked for indirect discharge projects.

However, when a project discharges indirectly to a municipal sewer, the
downstream WWTP may itself discharge to a surface water body with a
downstream drinking water intake. This information is relevant in
jurisdictions with source water protection programs that extend to
WWTP receiving waters (e.g., Ontario Clean Water Act source protection
plans, EU Water Framework Directive protected areas).

**Required fix:**
Ask Q15 with an adapted label when indirect_sanitary_sewer is selected:
"Does the receiving municipal WWTP discharge to a watercourse with a
downstream drinking water intake?"

---

### BUG-06 — Q3 Capacity: m³/day unit not intuitive for small projects
**Severity: MINOR**
**Affected profiles: P1, P5**

**Problem:**
A restaurant produces typically 1–5 m³/day of kitchen wastewater.
The "micro (< 10 m³/day)" category is correct, but m³/day is not
intuitive for a food service operator or engineer working with small
systems — who typically think in L/day or population equivalents (PE).

For P5 (rural septic), capacity is often expressed in population
equivalents (PE) or person equivalents, not m³/day.

**Suggested fix:**
Add equivalences in parentheses:
- "< 10 m³/day (approx. < 100 PE or < 10,000 L/day)"
- "10 – 500 m³/day (approx. 100 – 5,000 PE)"

---

### BUG-07 — Q16 Sensitive zones: always required regardless of discharge type
**Severity: MINOR**
**Affected profiles: P1**

**Problem:**
Q16 "Sensitive zones" is required:true and always visible for all projects,
including an urban restaurant connected to the municipal sewer. For such
a project, the sensitive zones question has limited regulatory relevance
and unnecessarily burdens the questionnaire flow.

**Suggested fix:**
Make Q16 conditional:
- Always required if discharge_type includes direct_surface_water,
  direct_groundwater, or land_application
- Optional (required:false) if discharge_type = indirect_sanitary_sewer only

---

### BUG-08 — Q19 Groundwater: "No impact" option not mutually exclusive
**Severity: MINOR**
**Affected profiles: P1, P2**

**Problem:**
The option "No — no groundwater impact identified" exists (a correction
applied in v2), but it is not mutually exclusive with other options in
the UI. A user could accidentally check both "Yes — infiltration recharge"
AND "No groundwater impact."

**Required fix:**
Implement mutual exclusion logic in the frontend:
if "no_groundwater_impact" is checked → automatically uncheck all other
options, and vice versa (checking any "Yes" option unchecks "No").

---

### BUG-09 — Q6 Municipal WW subscopes: WWTP operator vs sewer connection conflated
**Severity: MAJOR**
**Affected profiles: P1**

**Problem:**
Q6 (municipal_wastewater_subscopes) proposes "Centralized municipal
wastewater treatment plant (WWTP)" as a sub-scope. A novice engineer
for a restaurant project may check this option thinking it refers to
where their wastewater goes — when in fact it designates the entity
that OPERATES the WWTP (i.e., the municipality itself).

This confusion leads to incorrect regulatory scope classification:
- Checking "centralized_wwtp" as an indirect discharger incorrectly implies
  the project proponent operates the WWTP
- The correct sub-scope for a restaurant is "pretreatment_to_sewer" only

Additionally, "Combined sewer overflow (CSO)" and "Hospital wastewater"
appear in Q6 for all municipal WW projects regardless of the promoter type,
creating unnecessary noise.

**Required fix:**
1. Clarify label: "Centralized WWTP — I am the operator of the treatment plant"
2. Add: "Connection to municipal sewer — indirect discharge (I am NOT the WWTP operator)"
3. Filter CSO and hospital options based on promoter_type

---

### BUG-10 — Q12 Water source: "No water intake" label misleading
**Severity: MINOR**
**Affected profiles: P1, P4 partial**

**Problem:**
Q12 offers "No water intake — discharge or treatment project only."
For a restaurant (P1), neither option is exactly right:
- It IS supplied by the municipal network → "municipal_supply" applies
- But "No water intake" suggests a purely discharge-focused project
  with no incoming water at all

The label is misleading for facilities supplied by the municipal
distribution network that do not abstract raw water themselves.

**Suggested fix:**
Rename "No water intake" to:
"No raw water abstraction — facility supplied entirely by municipal
distribution network or other utility"

---

## AUDIT SUMMARY

| Bug ID | Description | Severity | Fix Priority |
|--------|-------------|----------|-------------|
| BUG-01 | Q17 Water streams not filtered by discharge type | CRITICAL | P1 |
| BUG-02 | Q18 Activities not filtered by scope/source | CRITICAL | P1 |
| BUG-03 | "Discharge" term ambiguous (direct vs indirect) | MAJOR | P2 |
| BUG-04 | FSE/restaurant not guided to correct scope | MAJOR | P2 |
| BUG-05 | Q15 downstream intake missing for indirect discharge | MAJOR | P2 |
| BUG-09 | Q6 WWTP operator vs sewer connection conflated | MAJOR | P2 |
| BUG-06 | m³/day unit not intuitive for small projects | MINOR | P3 |
| BUG-07 | Q16 sensitive zones always required | MINOR | P3 |
| BUG-08 | Q19 "No groundwater" not mutually exclusive | MINOR | P3 |
| BUG-10 | Q12 "No water intake" label misleading | MINOR | P3 |
| BUG-11 | Location not enforced at submit | MAJOR | P3 (post-deploy) |
| BUG-12-A | Canonical ID vs UI counter — test methodology confusion | DOCUMENTATION | — |
| BUG-12-B | Q17 raw_wastewater label misleading for septic/onsite projects | MEDIUM | P3 |
| BUG-12-C | STEP 3 subscopes in fixed schema order instead of selection order | MEDIUM | P3 |

### Correction roadmap

**Priority 1 — Blocking (before any deployment)**
- BUG-01: Dynamic filtering of Q17 by discharge_type + water_families
- BUG-02: Dynamic filtering of Q18 by water_source + discharge_type + water_families

**Priority 2 — Important (before production deployment)**
- BUG-03: Split "Discharge" activity into direct vs indirect
- BUG-04: Add FSE/food service sub-scope
- BUG-05: Extend Q15 to indirect discharge projects
- BUG-09: Clarify WWTP operator vs sewer connection in Q6

**Priority 3 — UX improvements (post-deployment)**
- BUG-06: Add PE equivalences to capacity options
- BUG-07: Make Q16 conditional for indirect-only projects
- BUG-08: Mutual exclusion logic for Q19 groundwater
- BUG-10: Clarify Q12 "No raw water abstraction" label
- BUG-11: Location soft-start + hard-block at submit
- BUG-12-A: Documentation convention (no code change)
- BUG-12-B: Contextual label for raw_wastewater in septic/decentralized projects
- BUG-12-C: STEP 3 subscope order aligned to user selection order

---

### BUG-11 — Location: non-blocking at start but not enforced at submission
**Severity: MAJOR**
**Affected profiles: All profiles**
**Discovered: post-deployment testing**

**Problem:**
STEP 0 (project location) is documented as a blocking gate but is not enforced
at any point in the current UI. A user can complete all 20 questions and submit
the intake without ever entering or confirming a project location.

This is a critical data quality issue: the regAssist engine requires a confirmed
jurisdiction (country → province/state → municipality + GPS coordinates) to map
applicable regulations. A classification object without location context is
unusable for regulatory identification.

**Expected behavior (Perspective 1 — soft start, hard block at submit):**
- Start: map and location field displayed with a soft invitation to confirm the
  project site. User CAN proceed to questions without confirming location.
  This supports feasibility-phase use where the exact site may not yet be known.
- Questions 1-20: fully accessible without location confirmation.
- Submit button: BLOCKED if location has not been explicitly confirmed.
  Clear error message shown. User must confirm location before submission.

**Definition of "confirmed location":**
- Location field is not empty AND not the default placeholder value
- User has clicked the "Confirm location" button explicitly, OR
- User has performed a geocoding search and the result was accepted, OR
- User has clicked/dragged the map marker to a new position

**Required fix — all affected files:**
1. audit_questionnaire_v2.md: add this entry
2. plan_questions.md: update STEP 0 blocking rule
3. canonical.yaml: update STEP 0 comment
4. en.yaml: add new location_ui labels (confirm button, warning message)
5. intake_router.py: add project.location validation in _validate_answers()
6. IntakeForm.jsx: add locationConfirmed prop + submit-time validation
7. index.html: implement confirm button, location state, submit block + message

**writes_to:** project.location.confirmed (boolean),
              project.location.name (string),
              project.location.coordinates (lat, lng)

---

### BUG-12-A — Canonical ID vs UI visible counter: source of test confusion
**Severity: DOCUMENTATION**
**Affected profiles: All (test methodology)**
**Discovered: P5 simulation session**

**Problem:**
During manual simulation of Use Case P5 (decentralized septic), test navigation
was documented using the UI visible question counter (e.g., "Question 5 of 7")
rather than canonical question IDs (e.g., `municipal_wastewater_subscopes`).

The UI counter is a dynamic value that depends on which questions are visible at
any given moment — it changes based on user selections. For example:

- If `drinking_water` is NOT selected (P5), then `drinking_water_subscopes` is
  hidden. The UI displays `municipal_wastewater_subscopes` as "Question 5" even
  though its canonical ID is Q6 in the schema ordering.
- If `drinking_water` IS selected, `drinking_water_subscopes` appears first, and
  `municipal_wastewater_subscopes` becomes "Question 6".

Using UI counters as stable identifiers in test scripts or cross-file references
creates confusion and documentation errors.

**Required fix:**
1. plan_questions.md: add explicit note distinguishing canonical IDs from UI counter
2. canonical.yaml: add comment in STEP 3 section
3. audit_questionnaire_v2.md: add this entry
4. Testing convention: always reference questions by canonical ID in test scripts.
   Format: `[canonical_id]` e.g., `[municipal_wastewater_subscopes]`, not "Q5" or
   "Question 5".

**No code change required.** Documentation and convention fix only.

---

### BUG-12-B — Q17 raw_wastewater: label misleading for decentralized / septic projects
**Severity: MEDIUM**
**Affected profiles: P5 (decentralized septic) and any decentralized_onsite project**
**Discovered: P5 simulation session**

**Problem:**
The option `raw_wastewater` in Q17 (water_streams) is visible when `hasMWW = true`,
which includes projects with `decentralized_onsite` selected in
`municipal_wastewater_subscopes`. Its static label is:

  "Raw wastewater (WWTP influent — incoming sewage to treatment plant)"

For a septic tank or package plant project, this label is semantically incorrect:
- A septic tank does not receive "WWTP influent" — it receives household sewage
  directly. There is no WWTP in a decentralized on-site system.
- The label incorrectly implies the user is declaring an influent stream to a
  centralized treatment plant, which may distort the regulatory classification.

**Required fix:**
Apply a contextual label override at render time based on `municipal_wastewater_subscopes`:

| Context | Condition | Label |
|---------|-----------|-------|
| Centralized / default | `centralized_wwtp_operator` selected OR `decentralized_onsite` not selected | "Raw wastewater (WWTP influent — incoming sewage to treatment plant)" |
| Decentralized / on-site | `decentralized_onsite` selected AND `centralized_wwtp_operator` NOT selected | "Raw wastewater (septic tank influent / household sewage)" |

**Files changed:**
1. plan_questions.md — label_context documented for raw_wastewater
2. canonical.yaml — label_context comment added to raw_wastewater option
3. en.yaml — new key: `raw_wastewater_decentralized` added under water_streams.options
4. audit_questionnaire_v2.md — this entry
5. IntakeForm.jsx — `getLabelOverrides(qId, answers)` added; `getFilteredOptions()` applies `.map()` override
6. index.html — same as IntakeForm.jsx (standalone demo)

**intake_router.py:** No change needed. Label context is a frontend rendering concern.
The router returns the base `raw_wastewater` label from locale; the frontend overrides it.

---

### BUG-12-C — STEP 3 sub-scopes: rendered in fixed schema order, not user selection order
**Severity: MEDIUM**
**Affected profiles: All multi-scope projects (P2, P4, any project with 2+ water families)**
**Discovered: P5 simulation session**

**Problem:**
The documented rule in plan_questions.md states:
  "For each scope checked in STEP 2, one dedicated sub-scope question is
   generated in the exact order the user selected it."

However, `visibleQ()` (index.html) and `visibleQuestions()` (IntakeForm.jsx) both
return `SCHEMA.questions.filter(isVisible)`, which preserves the **fixed schema
order** — not the user's selection order from Q4.

Example: If a user selects `municipal_wastewater` first, then `drinking_water`, the
UI shows `drinking_water_subscopes` before `municipal_wastewater_subscopes` (schema
order), ignoring the declared selection order.

This violates the documented UX contract and creates a disconnect between the scope
selection in STEP 2 and the sub-scope sequence in STEP 3.

**Required fix:**
After filtering visible questions, sort sub-scope questions by the index of their
parent family in `answers['water_families']`. A `SUBSCOPE_FAMILY_MAP` constant
provides the mapping. Non-subscope questions preserve their original relative order
(stable sort guarantee in ES2019+).

```
SUBSCOPE_FAMILY_MAP = {
  drinking_water_subscopes:        'drinking_water',
  municipal_wastewater_subscopes:  'municipal_wastewater',
  industrial_wastewater_subscopes: 'industrial_wastewater',
  stormwater_subscopes:            'stormwater',
  groundwater_subscopes:           'groundwater',
  water_reuse_subscopes:           'water_reuse',
  residuals_subscopes:             'residuals_biosolids'
}
```

**Files changed:**
1. plan_questions.md — BUG-12-C fix note added to STEP 3
2. canonical.yaml — ordering rule comment added to STEP 3 section
3. audit_questionnaire_v2.md — this entry
4. IntakeForm.jsx — `SUBSCOPE_FAMILY_MAP` + `visibleQuestions()` sort updated
5. index.html — `SUBSCOPE_FAMILY_MAP` + `visibleQ()` sort updated

**intake_router.py:** No change needed. Schema ordering is a frontend concern.
