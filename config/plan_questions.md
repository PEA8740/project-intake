# plan_questions.md — AquaForge regAssist Intake Questionnaire v2.1
# Corrected version — Full audit pass (BUG-01 to BUG-14)
# Ref: audit_questionnaire_v2.md

## Changelog v2.0 → v2.1
# BUG-01: Q17 water_streams — dynamic filtering rules added by discharge_type + water_families
# BUG-02: Q18 project_activities — dynamic filtering rules added by source + discharge_type
# BUG-03: Q18 "discharge" activity split into direct_environmental_discharge + sewer_connection_discharge
# BUG-04: Q6 municipal_wastewater_subscopes — FSE/food service sub-scope added
# BUG-05: Q15 downstream_drinking_water_intake — extended to indirect discharge projects
# BUG-06: Q3 project_capacity — PE equivalences added to all options
# BUG-07: Q16 sensitive_zones — made conditional (optional for indirect-only projects)
# BUG-08: Q19 groundwater_impact — mutual exclusion rule added for no_groundwater_impact
# BUG-09: Q6 municipal_wastewater_subscopes — WWTP operator vs sewer connection clarified
# BUG-10: Q12 water_source_type — "no_water_intake" relabeled for clarity
# BUG-12-A: Canonical ID (Q5–Q11) vs UI visible counter — distinction documented
# BUG-12-B: Q17 raw_wastewater — contextual label for decentralized_onsite (septic tank)
# BUG-12-C: STEP 3 sub-scope ordering — now rendered in water_families selection order
# BUG-13: Q13 discharge_type — hard block removed for distribution-only DW projects
#          required: true → required: false (conditional); new option not_applicable_supply_only
# BUG-14: Q17 water_streams + Q18 project_activities — treatment-plant streams/activities
#          hidden for distribution-only DW projects (hasDWTreatment flag)

---

## Target File Metadata

```
id: water_project_intake_v2
version: 0.2.1
domain: water
status: draft
locale_default: en
```

---

## Business Objective

Guide an engineer or water/wastewater consultant to identify the regulations
applicable to their project, based on:
1. Jurisdiction (country → province/state → municipality) — captured in STEP 0
2. Promoter type and industrial sector if applicable
3. Technical scope of the project
4. Discharge type: direct (natural receiving environment) or indirect (municipal sewer)
5. Nature of the receiving environment
6. Nominal capacity (determines permit thresholds and monitoring requirements)

> Scalability principle: The canonical YAML is jurisdiction-agnostic.
> It captures universal water project concepts via ontology references.
> The regAssist engine maps concepts to applicable regulations based on jurisdiction.
> No specific regulatory instrument is referenced in this file.

---

## General Architecture — 6 Steps

```
STEP 0   Location                     (blocking gate — before anything else)
STEP 1   Project characterization     (promoter, phase, capacity, sector)
STEP 2   Primary water scopes         (water families)
STEP 3   Detailed sub-scopes          (per selected scope, in selection order)
STEP 4   Source & receiving env.      (discharge type, receiving body, sensitive zones)
STEP 5   Streams, activities & GW     (complete logical treatment chain)
```

> Multi-scope navigation rule: For each scope checked in STEP 2, one dedicated
> sub-scope question is generated in the exact order the user selected it.
>
> BUG-12-C fix: This ordering rule is now enforced in the frontend (visibleQ() /
> visibleQuestions()). Sub-scope questions are sorted by the index of their parent
> family in answers['water_families'], preserving user selection order. Implemented
> via SUBSCOPE_FAMILY_MAP constant + stable Array.sort on the filtered question list.
>
> BUG-12-A note — Canonical IDs vs UI counter: Sub-scope questions have stable
> canonical IDs (Q5 = drinking_water_subscopes … Q11 = residuals_subscopes). The
> UI displays a dynamic visible-question counter (e.g. "Question 3 of 7") that
> depends on which questions are currently visible — it does NOT correspond to
> canonical IDs. Always reference questions by canonical ID in test scripts,
> audit documents, and cross-file references. Never use the UI counter as a
> stable identifier.

---

## STEP 0 — Location (pre-questionnaire, blocking gate)

Fields captured (map UI component — not YAML questions):
- Country (required)
- Province / State / Region (required)
- Municipality / City (required)
- GPS coordinates (auto-detected or manual)
- Auto-detected receiving environment (type, name, distance) with user confirmation

> Critical fix retained from v2.0: detection must cover large lakes, coastal zones,
> tidal waters, and seasonal streams — not only rivers.

writes_to: project.location.*, project.receiving_environment.auto_detected

---

## STEP 1 — Project Characterization

### Q1 — Promoter type
```
id: promoter_type
type: radio
required: true
writes_to: project.promoter_type
```
Options:
- `municipal` — Municipal authority / public water utility
  - ontology_refs.subdomains: [municipal_water_utility, public_authority]
- `industrial` — Industrial company (sector to be specified in Q1b)
  - ontology_refs.subdomains: [industrial_facility, manufacturing]
- `private_utility` — Private operator / concession holder
  - ontology_refs.subdomains: [private_utility, concession]
- `institutional` — Institutional facility (hospital, university, campus, military,
  food service, commercial kitchen)
  - ontology_refs.subdomains: [institutional_facility]
  > NOTE: Food service establishments (restaurants, cafeterias, hotels) are
  > classified as "institutional" here but generate effluents regulated under
  > FSE/FOG pretreatment programs — users will be guided to the correct
  > sub-scope in Q6 via contextual help text.
- `agricultural` — Agricultural operator / fish farm / livestock operation
  - ontology_refs.subdomains: [agricultural_operator, aquaculture]
- `federal_government` — Federal or national government agency
  - ontology_refs.subdomains: [federal_agency, government_facility]
- `real_estate_developer` — Real estate developer
  - ontology_refs.subdomains: [land_development]
- `other` — Other (describe in free-text question)

Condition triggered: if `industrial` → display Q1b

---

### Q1b — Industrial sector *(conditional on Q1 = industrial)*
```
id: industrial_sector
type: multi_select
required_if:
  equals:
    question: promoter_type
    value: industrial
writes_to: project.industrial_sector
```
Options:
- `food_beverage` — Food and beverage processing
- `pulp_paper` — Pulp, paper and wood products
- `mining_metals` — Mining, quarrying and metal processing
- `chemical_pharma` — Chemical and pharmaceutical manufacturing
- `petroleum_refining` — Petroleum refining and petrochemicals
- `textile_tannery` — Textile, dyeing and tannery
- `power_generation` — Power generation (thermal, nuclear, hydro)
- `semiconductor_electronics` — Semiconductor and electronics manufacturing
- `hospital_healthcare` — Hospital and healthcare (micropollutants, pharmaceuticals)
- `other_industrial` — Other industrial sector

---

### Q2 — Project phase
```
id: project_phase
type: radio
required: true
writes_to: project.phase
```
Options:
- `feasibility_predesign` — Feasibility study / pre-design
- `detailed_design` — Detailed engineering design
- `new_construction` — New project — construction
- `expansion` — Expansion / capacity increase
- `retrofit_upgrade` — Rehabilitation / technology upgrade
- `operation` — Operation of an existing system
- `decommissioning` — Decommissioning / closure
- `unknown` — Unknown / to be determined

---

### Q3 — Nominal project capacity [BUG-06 FIXED]
```
id: project_capacity
type: radio
required: true
writes_to: project.capacity_range
```
> BUG-06 fix: Population equivalent (PE) approximations added to all options
> to assist engineers working with small systems or rural projects where
> flow rates are expressed in PE rather than m³/day.

Options:
- `micro` — < 10 m³/day (approx. < 100 PE or < 10,000 L/day)
  Decentralized systems, single buildings, food service establishments
  - ontology_refs.subdomains: [micro_scale, decentralized_system]
- `small` — 10 – 500 m³/day (approx. 100 – 5,000 PE)
  Small communities, light industrial, rural systems
  - ontology_refs.subdomains: [small_scale_system]
- `medium` — 500 – 10,000 m³/day (approx. 5,000 – 100,000 PE)
  Mid-size communities, moderate industries
  - ontology_refs.subdomains: [medium_scale_system]
- `large` — 10,000 – 100,000 m³/day (approx. 100,000 – 1,000,000 PE)
  Large cities, heavy industries
  - ontology_refs.subdomains: [large_scale_system]
- `very_large` — > 100,000 m³/day (> 1,000,000 PE)
  Major metropolitan areas, large industrial complexes
  - ontology_refs.subdomains: [very_large_scale_system]
- `unknown` — Not yet determined / to be assessed

---

## STEP 2 — Primary Water Scopes

### Q4 — Water scopes
```
id: water_families
type: multi_select
required: true
writes_to: classification.water_families
```
Options (unchanged from v2.0):
- `drinking_water`
- `municipal_wastewater`
- `industrial_wastewater`
- `stormwater`
- `groundwater`
- `water_reuse`
- `residuals_biosolids`
- `other_unsure`

---

## STEP 3 — Detailed Sub-scopes

### Q5 — Drinking water sub-scopes (unchanged from v2.0)
```
id: drinking_water_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [drinking_water]
writes_to: classification.drinking_water_subscopes
```
Options (unchanged):
- `drinking_water_treatment`
- `drinking_water_distribution`
- `source_water_intake`
- `private_well_supply`
- `desalination`

---

### Q6 — Municipal wastewater sub-scopes [BUG-04 + BUG-09 FIXED]
```
id: municipal_wastewater_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [municipal_wastewater]
writes_to: classification.municipal_wastewater_subscopes
```
> BUG-09 fix: "Centralized WWTP" relabeled to make explicit that it designates
> the WWTP OPERATOR — not a facility that connects to the municipal sewer.
> A new "sewer connection" option added for facilities that discharge indirectly.
> BUG-04 fix: New FSE/food service sub-scope added for restaurants, cafeterias,
> hotels, and commercial kitchens regulated under FOG pretreatment programs.

> CONTEXTUAL HELP: If you are a restaurant, cafeteria, hotel kitchen, or any
> food service establishment, select "Food service / commercial kitchen discharge"
> in addition to any other applicable options.

Options:
- `domestic_residential` — Domestic / residential / institutional wastewater
  (households, apartment buildings, offices)
  - ontology_refs.subdomains: [domestic_wastewater, residential_sewage]

- `food_service_establishment` — Food service / commercial kitchen discharge
  to sewer (FOG / grease interceptor / fats, oils and grease program)
  [NEW — BUG-04]
  - ontology_refs.subdomains: [food_service_establishment, fog_program,
    grease_interceptor, fats_oils_grease]
  > Applies to: restaurants, cafeterias, hotel kitchens, food processing
  > facilities discharging to the municipal sewer. Triggers FOG pretreatment
  > requirements and grease interceptor installation obligations.

- `combined_sewer_overflow` — Combined sewer overflow (CSO) management
  - ontology_refs.subdomains: [combined_sewer, cso_management]
  > Applies to: municipalities operating combined (sanitary + stormwater)
  > sewer networks subject to CSO control programs.

- `hospital_wastewater` — Hospital / healthcare wastewater
  (micropollutants, pharmaceuticals, pathogens)
  - ontology_refs.subdomains: [hospital_wastewater, pharmaceutical_micropollutants]
  > Applies to: hospitals, clinics, long-term care facilities with wastewater
  > containing pharmaceuticals, disinfectants, or infectious agents.

- `sewer_connection_indirect_discharge` — Connection to municipal sewer —
  indirect discharge (I connect TO the sewer; I do NOT operate the WWTP)
  [NEW — BUG-09]
  - ontology_refs.subdomains: [indirect_discharge, sewer_connection,
    municipal_sewer_user]
  > For any facility (commercial, industrial, institutional) that discharges
  > to the municipal sanitary sewer system and is subject to sewer use bylaws
  > and pretreatment requirements. The municipality operates the downstream WWTP.

- `centralized_wwtp_operator` — Centralized municipal WWTP — I am the OPERATOR
  of the treatment plant [RELABELED — BUG-09]
  - ontology_refs.use_cases: [municipal_wwtp, centralized_treatment]
  > Select this ONLY if your organization operates the wastewater treatment
  > plant itself (typically a municipality or its contracted operator).

- `pretreatment_to_sewer` — Industrial pretreatment before discharge to
  municipal sewer (industrial-strength effluent requiring on-site treatment
  before sewer connection)
  - ontology_refs.use_cases: [industrial_pretreatment, indirect_discharge]

- `decentralized_onsite` — Decentralized / on-site treatment
  (septic tank, package plant, constructed wetland, biofilter)
  - ontology_refs.use_cases: [onsite_septic, decentralized_treatment]

- `land_application` — Land application of treated effluent or biosolids
  - ontology_refs.use_cases: [effluent_land_application, biosolids_land_application]

- `direct_environmental_discharge` — Direct discharge to a natural receiving
  environment after treatment (river, lake, coastal water)
  - ontology_refs.use_cases: [effluent_discharge, direct_discharge]

---

### Q7 — Industrial wastewater sub-scopes (unchanged from v2.0)
```
id: industrial_wastewater_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [industrial_wastewater]
writes_to: classification.industrial_wastewater_subscopes
```
Options (unchanged from v2.0):
- `process_effluent_direct_discharge`
- `process_effluent_to_sewer`
- `cooling_water_blowdown`
- `landfill_leachate`
- `agricultural_runoff_return`
- `aquaculture_effluent`

---

### Q8 — Stormwater sub-scopes (unchanged from v2.0)
```
id: stormwater_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [stormwater]
writes_to: classification.stormwater_subscopes
```
Options unchanged.

---

### Q9 — Groundwater sub-scopes (unchanged from v2.0)
```
id: groundwater_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [groundwater]
writes_to: classification.groundwater_subscopes
```
Options unchanged.

---

### Q10 — Water reuse sub-scopes (unchanged from v2.0)
```
id: water_reuse_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [water_reuse]
writes_to: classification.water_reuse_subscopes
```
Options unchanged.

---

### Q11 — Residuals / biosolids sub-scopes (unchanged from v2.0)
```
id: residuals_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [residuals_biosolids]
writes_to: classification.residuals_subscopes
```
Options unchanged.

---

## STEP 4 — Source & Receiving Environment

### Q12 — Nature of the raw water source [BUG-10 FIXED]
```
id: water_source_type
type: multi_select
required: true
writes_to: project.water_source
```
> BUG-10 fix: "No water intake" relabeled to clearly distinguish between
> a project with no raw water abstraction (facility on municipal supply)
> and a project with no water input at all.

Options:
- `river_stream` — River / stream (flowing surface water)
  - ontology_refs.subdomains: [surface_water, river, flowing_water]
- `lake_reservoir` — Lake / reservoir (standing surface water)
  - ontology_refs.subdomains: [surface_water, lake, reservoir]
- `large_lake_system` — Large lake system (Great Lakes, Lake Geneva,
  Caspian Sea, Scandinavian lakes, African Great Lakes...)
  - ontology_refs.subdomains: [large_lake, transboundary_water]
- `ocean_coastal` — Ocean / coastal / estuarine water
  - ontology_refs.subdomains: [seawater, coastal_water, estuarine_water]
- `confined_aquifer` — Confined aquifer (artesian groundwater)
  - ontology_refs.subdomains: [confined_aquifer, artesian_water]
- `unconfined_aquifer` — Unconfined aquifer / water table
  - ontology_refs.subdomains: [unconfined_aquifer, phreatic_water]
- `municipal_supply` — Pre-treated municipal water supply (utility feed)
  The facility is connected to and supplied by the municipal distribution
  network — no raw water abstraction performed on-site.
  - ontology_refs.subdomains: [municipal_water_supply, treated_water]
- `rainwater_harvesting` — Rainwater harvesting / rooftop collection
  - ontology_refs.subdomains: [rainwater_harvesting, precipitation]
- `no_raw_water_abstraction` — No raw water abstraction and no municipal
  supply — discharge or treatment project only (e.g., WWTP receiving
  wastewater only, no process water intake)
  [RELABELED from "no_water_intake" — BUG-10]
  - ontology_refs.subdomains: [no_water_intake, discharge_only_project]

---

### Q13 — Discharge type [KEY REGULATORY VARIABLE]
```
id: discharge_type
type: multi_select
required: false                          ← BUG-13: was required: true
required_unless_distribution_only: true  ← BUG-13: custom flag — see below
writes_to: classification.discharge_type
```
Options (v2.1.3 — BUG-13 adds not_applicable_supply_only):
- `direct_surface_water`
- `direct_groundwater`
- `indirect_sanitary_sewer`
- `indirect_storm_sewer`
- `land_application`
- `reuse_on_site`
- `hauled_offsite_treatment`
- `no_discharge_closed_loop`
- `not_applicable_supply_only` ← **NEW (BUG-13)**
- `unknown_to_determine`

> **BUG-13 fix — Conditional required logic:**
> Q13 is NOT required (and not validated as mandatory) when the project is
> "distribution-only": `drinking_water_distribution` selected in drinking_water_subscopes
> AND none of [drinking_water_treatment, source_water_intake, private_well_supply,
> desalination] selected AND no effluent-generating water families selected
> (municipal_wastewater, industrial_wastewater, stormwater, residuals_biosolids,
> water_reuse, groundwater).
>
> Frontend implementation: `isDischargeGenerating()` helper function in index.html
> and IntakeForm.jsx. `validate()` skips mandatory check when
> `isDischargeGenerating()` returns false.
>
> For distribution-only profiles, the question remains VISIBLE with a contextual
> note and `not_applicable_supply_only` pre-highlighted. User may still select any
> option if applicable (e.g., overflow discharge from storage tanks).

---

### Q14 — Nature of the receiving environment
```
id: receiving_environment_type
type: multi_select
required_if:
  any_selected:
    question: discharge_type
    values: [direct_surface_water, direct_groundwater]
writes_to: project.receiving_environment.type
```
Options (unchanged from v2.0).

---

### Q15 — Downstream drinking water intake [BUG-05 FIXED]
```
id: downstream_drinking_water_intake
type: radio
required_if:
  any_selected:
    question: discharge_type
    values: [direct_surface_water, indirect_sanitary_sewer,
             indirect_storm_sewer]
writes_to: project.receiving_environment.downstream_intake
```
> BUG-05 fix: Q15 is now triggered for BOTH direct AND indirect discharge.
> For indirect discharge, the question label changes to address the
> downstream WWTP receiving water (handled in locale file labels).
> This captures source water protection obligations that apply even
> when the immediate receiving body is the municipal sewer system.

Options:
- `yes_confirmed` — Yes — confirmed downstream drinking water intake
  (on direct receiving water, or on WWTP discharge watercourse)
  - ontology_refs.subdomains: [source_water_protection, intake_zone]
- `yes_suspected` — Probable but not confirmed
  - ontology_refs.subdomains: [source_water_assessment]
- `no` — No downstream drinking water intake identified
- `unknown` — Unknown

---

### Q16 — Protected or sensitive zones [BUG-07 FIXED]
```
id: sensitive_zones
type: multi_select
required_if:
  any_selected:
    question: discharge_type
    values: [direct_surface_water, direct_groundwater, land_application,
             indirect_sanitary_sewer, indirect_storm_sewer,
             hauled_offsite_treatment]
required: false   ← optional if discharge_type = reuse_on_site or
                    no_discharge_closed_loop only
writes_to: project.sensitive_zones
```
> BUG-07 fix: Q16 is now conditional. It remains required for all projects
> with ANY environmental pathway (direct, indirect, land application).
> It becomes optional (required:false) ONLY for fully closed-loop or
> pure on-site reuse projects with no external discharge pathway.
> Note: even indirect discharge can trigger sensitive zone obligations
> (e.g., WWTP in a source protection area), so it is retained for
> indirect discharge projects.

Options (unchanged from v2.0 — all universal, no jurisdiction-specific references):
- `drinking_water_source_protection_area`
- `protected_biodiversity_habitat`
- `fish_aquatic_habitat`
- `wetland_protected`
- `drinking_water_watershed`
- `floodplain_flood_risk_zone`
- `transboundary_shared_water_body`
- `indigenous_traditional_territory`
- `none_identified`
- `unknown`

---

## STEP 5 — Streams, Activities & Groundwater

### Q17 — Water streams [BUG-01 FIXED]
```
id: water_streams
type: multi_select
required: true
writes_to: classification.water_streams
```
> BUG-01 fix: Dynamic filtering rules are mandatory for this question.
> The frontend MUST filter options based on (water_families + discharge_type).
> The canonical YAML lists ALL possible options; filtering is applied at
> render time by the IntakeForm component and the HTML demo.
> The filtering rules are documented below for each option.

Options with filtering rules:

**— Inputs (influents) —**

- `raw_water` — Raw water (surface or groundwater before any treatment)
  - ontology_refs.subdomains: [raw_water, influent, source_water]
  - SHOW IF: drinking_water OR (industrial_wastewater AND source ≠ municipal_supply_only)
  - HIDE IF: source = municipal_supply only AND no drinking_water scope

- `raw_wastewater` — Raw wastewater (WWTP influent — incoming sewage)
  - ontology_refs.subdomains: [raw_wastewater, sewage_influent]
  - SHOW IF: municipal_wastewater OR industrial_wastewater
  - HIDE IF: drinking_water only, OR indirect discharge only without WW scope
  - LABEL CONTEXT [BUG-12-B]: context-aware label required at render time
    - If decentralized_onsite selected AND centralized_wwtp_operator NOT selected:
      → label_key: raw_wastewater_decentralized
      → "Raw wastewater (septic tank influent / household sewage)"
    - Otherwise (WWTP operator or industrial WW):
      → label_key: raw_wastewater (default)
      → "Raw wastewater (WWTP influent — incoming sewage to treatment plant)"

- `industrial_process_water` — Industrial process water (incoming)
  - ontology_refs.subdomains: [process_water, industrial_influent]
  - SHOW IF: industrial_wastewater selected
  - HIDE IF: industrial_wastewater not selected

**— Internal process streams —**

- `filter_backwash_water` — Filter backwash water
  (rapid sand filters, ultrafiltration, membrane backwash)
  - ontology_refs.subdomains: [filter_backwash, process_residuals]
  - SHOW IF: drinking_water OR municipal_wastewater (treatment plant operator)
  - HIDE IF: pure indirect discharge without treatment plant

- `membrane_concentrate_ro_reject` — Membrane concentrate / RO reject / NF brine
  - ontology_refs.subdomains: [membrane_concentrate, ro_reject, brine_disposal]
  - SHOW IF: drinking_water OR water_reuse OR industrial_wastewater
  - HIDE IF: pure indirect discharge small projects, septic systems

- `recycled_process_water` — Recycled / recirculated process water
  - ontology_refs.subdomains: [process_recycle, internal_recirculation]
  - SHOW IF: drinking_water OR municipal_wastewater OR industrial_wastewater
  - HIDE IF: simple indirect discharge without treatment

- `disinfection_byproduct_streams` — Disinfection by-product streams
  (THM, HAA, chloramine-bearing purges)
  - ontology_refs.subdomains: [disinfection_byproducts, dbp_management]
  - SHOW IF: drinking_water OR municipal_wastewater (WWTP operator)
  - HIDE IF: indirect discharge without on-site treatment

- `cooling_water` — Cooling water (circulating or once-through)
  - ontology_refs.subdomains: [cooling_water, thermal_stream]
  - SHOW IF: industrial_wastewater OR power_generation sector
  - HIDE IF: municipal WW only, drinking water only, small commercial

**— Outputs (effluents & residuals) —**

- `treated_drinking_water` — Treated drinking water (finished water)
  - ontology_refs.subdomains: [finished_water, potable_water]
  - SHOW IF: drinking_water selected
  - HIDE IF: drinking_water not selected

- `treated_wastewater_effluent` — Treated wastewater effluent (final effluent)
  - ontology_refs.subdomains: [treated_effluent, final_effluent]
  - SHOW IF: (municipal_wastewater OR industrial_wastewater) AND
    (direct_surface_water OR water_reuse OR land_application)
  - HIDE IF: indirect discharge only (effluent goes to sewer, not to environment)

- `sludge_biosolids` — Sludge / biosolids (treatment residuals)
  - ontology_refs.subdomains: [sludge, biosolids, treatment_residuals]
  - SHOW IF: municipal_wastewater OR drinking_water OR industrial_wastewater
    OR residuals_biosolids
  - HIDE IF: pure sewer connection without on-site treatment

- `spent_filter_media_resin` — Spent filter media / exhausted resins
  - ontology_refs.subdomains: [spent_media, spent_resin]
  - SHOW IF: drinking_water OR municipal_wastewater OR industrial_wastewater
  - HIDE IF: pure sewer connection without on-site treatment

- `stormwater_site_runoff` — Stormwater / site runoff (facility drainage)
  - ontology_refs.subdomains: [stormwater, site_runoff]
  - SHOW IF: stormwater OR industrial_wastewater OR municipal_wastewater
  - HIDE IF: building-only projects without significant outdoor area

- `leachate` — Leachate (landfill, contaminated site, sludge lagoon)
  - ontology_refs.subdomains: [leachate, landfill_leachate]
  - SHOW IF: residuals_biosolids OR industrial_wastewater OR groundwater
  - HIDE IF: standard WW or DW projects without landfill/contaminated site

---

### Q18 — Project activities [BUG-02 + BUG-03 FIXED]
```
id: project_activities
type: multi_select
required: true
writes_to: classification.project_activities
```
> BUG-02 fix: Dynamic filtering rules mandatory. Frontend filters options
> based on (water_source_type + discharge_type + water_families).
> BUG-03 fix: "Discharge" activity split into two distinct options:
> (a) direct environmental discharge and (b) sewer connection discharge.
> These are regulatory opposites and must never be conflated.

Options with filtering rules:

- `water_abstraction_withdrawal` — Water abstraction / withdrawal
  (raw water intake pumping, well extraction)
  - ontology_refs.use_cases: [water_abstraction, water_withdrawal]
  - SHOW IF: source includes river_stream, lake_reservoir, large_lake_system,
    ocean_coastal, confined_aquifer, unconfined_aquifer, or rainwater_harvesting
  - HIDE IF: source = municipal_supply only (no raw water abstraction)

- `pretreatment` — Pretreatment (screening, grit removal, oil-grease
  separation, grease interceptor, flow equalization)
  - ontology_refs.use_cases: [pretreatment, primary_treatment, grease_interceptor]
  - SHOW IF: always (applicable to any project type including FSE/restaurant)

- `treatment` — Primary or secondary treatment (conventional water or
  wastewater treatment)
  - ontology_refs.use_cases: [water_treatment, secondary_treatment]
  - SHOW IF: always (applicable to any project with on-site treatment)

- `advanced_treatment` — Advanced treatment (ozonation, GAC, UV, membranes,
  advanced oxidation processes)
  - ontology_refs.use_cases: [advanced_treatment, tertiary_treatment]
  - SHOW IF: drinking_water OR municipal_wastewater OR water_reuse OR
    industrial_wastewater
  - HIDE IF: pure sewer connection, septic only

- `storage` — Storage (clearwells, balancing tanks, effluent lagoons)
  - ontology_refs.use_cases: [water_storage, effluent_storage]
  - SHOW IF: always

- `collection_conveyance` — Collection and conveyance — operating a
  sewer network or distribution main
  (sewer pipes, distribution pipes, pumping stations)
  - ontology_refs.use_cases: [collection_system, conveyance, pumping_station]
  - SHOW IF: municipal_wastewater AND centralized_wwtp_operator selected,
    OR drinking_water AND drinking_water_distribution selected
  - HIDE IF: facility is a sewer USER (not operator) — i.e., connects to
    municipal sewer but does not operate any network itself

- `direct_environmental_discharge` — Environmental discharge — direct
  release of treated effluent to a receiving water body or land
  [SPLIT FROM "discharge" — BUG-03]
  - ontology_refs.use_cases: [effluent_discharge, direct_environmental_release]
  - SHOW IF: discharge_type includes direct_surface_water, direct_groundwater,
    or land_application
  - HIDE IF: indirect discharge only (sewer connection, reuse, closed loop)

- `sewer_connection_discharge` — Sewer connection discharge — indirect
  release of effluent or pretreated wastewater to the municipal sewer
  [NEW OPTION — BUG-03]
  - ontology_refs.use_cases: [indirect_discharge, sewer_connection,
    pretreatment_discharge]
  - SHOW IF: discharge_type includes indirect_sanitary_sewer or
    indirect_storm_sewer
  - HIDE IF: direct discharge only, closed loop, reuse only

- `reuse` — Water reuse (reclaimed water supply, on-site or off-site)
  - ontology_refs.use_cases: [water_reuse, reclaimed_water_supply]
  - SHOW IF: water_reuse in water_families OR reuse_on_site in discharge_type
  - HIDE IF: no reuse scope and no reuse discharge type

- `residuals_management` — Residuals management (sludge handling,
  dewatering, spent media disposal)
  - ontology_refs.use_cases: [residuals_management, sludge_handling]
  - SHOW IF: municipal_wastewater OR drinking_water OR industrial_wastewater
    OR residuals_biosolids
  - HIDE IF: pure sewer connection without on-site treatment generating residuals

- `monitoring_reporting` — Monitoring and regulatory reporting
  (self-monitoring, compliance reporting, effluent sampling)
  - ontology_refs.use_cases: [effluent_monitoring, compliance_reporting]
  - SHOW IF: always

---

### Q19 — Groundwater or aquifer impact [BUG-08 FIXED]
```
id: groundwater_impact
type: multi_select
required: true
writes_to: classification.groundwater_impact
```
> BUG-08 fix: Mutual exclusion rule added.
> "no_groundwater_impact" must be mutually exclusive with all "Yes" options.
> Frontend rule: selecting "no_groundwater_impact" automatically deselects
> all other options. Selecting any "Yes" option automatically deselects
> "no_groundwater_impact".

Options:
- `groundwater_withdrawal_well` — Yes — groundwater withdrawal or production well
  - ontology_refs.use_cases: [groundwater_extraction, well_permit]
- `infiltration_recharge` — Yes — planned or potential infiltration / aquifer recharge
  - ontology_refs.use_cases: [managed_aquifer_recharge, infiltration_basin]
- `onsite_septic_subsurface` — Yes — on-site septic system or subsurface dispersal
  - ontology_refs.use_cases: [onsite_septic, subsurface_dispersal]
- `land_application_leaching` — Yes — land application with leaching / percolation potential
  - ontology_refs.use_cases: [land_application, percolation_risk]
- `dewatering_remediation` — Yes — groundwater dewatering or aquifer remediation
  - ontology_refs.use_cases: [groundwater_dewatering, aquifer_remediation]
- `leachate_residuals_risk` — Yes — residuals or leachate may affect groundwater
  - ontology_refs.use_cases: [leachate_risk, groundwater_contamination_risk]
- `no_groundwater_impact` — No — no groundwater impact identified
  [MUTUALLY EXCLUSIVE with all above — BUG-08]
  - ontology_refs.subdomains: [no_groundwater_pathway]
  > Frontend rule: selecting this option must automatically deselect all
  > other options in this question. Any "Yes" selection must deselect this option.

---

### Q20 — Free project description (unchanged from v2.0)
```
id: project_free_description
type: text_area
required: false
writes_to: project.free_description
```
Placeholder: "Describe any aspect not covered above: key water quality
parameters, site constraints, technologies under consideration, specific
pollutants (PFAS, microplastics, heavy metals, pathogens, FOG), flow
variability, regulatory history, or any other relevant information."

---

## Summary — 21 Questions across 6 Steps (v2.1.2)

| #   | ID                                  | Type         | Step | Conditional                       | Changed in v2.1 |
|-----|-------------------------------------|--------------|------|-----------------------------------|-----------------|
| 0   | location                            | Map UI       | 0    | No — blocking gate                | —               |
| 1   | promoter_type                       | radio        | 1    | No                                | Help text added |
| 1b  | industrial_sector                   | multi_select | 1    | If promoter_type = industrial     | —               |
| 2   | project_phase                       | radio        | 1    | No                                | —               |
| 3   | project_capacity                    | radio        | 1    | No                                | BUG-06: PE added|
| 4   | water_families                      | multi_select | 2    | No                                | —               |
| 5   | drinking_water_subscopes            | multi_select | 3    | If drinking_water                 | —               |
| 6   | municipal_wastewater_subscopes      | multi_select | 3    | If municipal_wastewater           | BUG-04, BUG-09  |
| 7   | industrial_wastewater_subscopes     | multi_select | 3    | If industrial_wastewater          | —               |
| 8   | stormwater_subscopes                | multi_select | 3    | If stormwater                     | —               |
| 9   | groundwater_subscopes               | multi_select | 3    | If groundwater                    | —               |
| 10  | water_reuse_subscopes               | multi_select | 3    | If water_reuse                    | —               |
| 11  | residuals_subscopes                 | multi_select | 3    | If residuals_biosolids            | —               |
| 12  | water_source_type                   | multi_select | 4    | No                                | BUG-10          |
| 13  | discharge_type                      | multi_select | 4    | No — key regulatory variable      | —               |
| 14  | receiving_environment_type          | multi_select | 4    | If direct discharge               | —               |
| 15  | downstream_drinking_water_intake    | radio        | 4    | If direct OR indirect discharge   | BUG-05          |
| 16  | sensitive_zones                     | multi_select | 4    | If any external pathway           | BUG-07          |
| 17  | water_streams                       | multi_select | 5    | No — filtered by scope+discharge  | BUG-01          |
| 18  | project_activities                  | multi_select | 5    | No — filtered by source+discharge | BUG-02, BUG-03  |
| 19  | groundwater_impact                  | multi_select | 5    | No — mutual exclusion rule        | BUG-08          |
| 20  | project_free_description            | text_area    | 5    | No                                | —               |

---

## Notes for Claude Code — YAML Generation (v2.1)

1. Follow the canonical structure of project_intake.canonical.yaml (reference file).
2. Each option must have id (snake_case) + ontology_refs (subdomains and/or use_cases).
3. Do NOT include regulatory_trigger fields.
4. Q15 required_if must include BOTH direct_surface_water AND indirect_sanitary_sewer
   and indirect_storm_sewer (BUG-05).
5. Q16 required_if must include indirect discharge types (BUG-07).
6. Q17 and Q18 SHOW/HIDE rules are frontend rendering rules — they are NOT
   encoded as required_if conditions in the YAML (which only supports
   question-level visibility). Document them as comments in the YAML.
7. Q18 must include two distinct discharge activity options:
   direct_environmental_discharge AND sewer_connection_discharge (BUG-03).
8. Q19 mutual exclusion rule is a frontend rule — not encodable in YAML.
   Document as a comment on the no_groundwater_impact option.
9. Q6 must include new options: food_service_establishment and
   sewer_connection_indirect_discharge; centralized_wwtp renamed to
   centralized_wwtp_operator (BUG-04, BUG-09).
10. Q12 no_water_intake renamed to no_raw_water_abstraction (BUG-10).
11. BUG-12-B: raw_wastewater in Q17 requires a contextual label override at render time.
    Two label keys exist in the locale file: raw_wastewater (default) and
    raw_wastewater_decentralized. Frontend applies the decentralized label when
    municipal_wastewater_subscopes includes decentralized_onsite AND does NOT include
    centralized_wwtp_operator. getLabelOverrides() in getFilteredOptions() handles this.
12. BUG-12-C: STEP 3 sub-scope questions must be sorted by parent family selection order
    (answers['water_families']). SUBSCOPE_FAMILY_MAP provides the mapping. visibleQ() /
    visibleQuestions() applies a stable sort on the filtered question list.
13. BUG-12-A: Canonical IDs (Q5–Q11) ≠ UI visible counter. Never reference questions
    by UI counter. Use canonical IDs in all cross-file references.
