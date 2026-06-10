# DWTP Intake Questionnaire — Plan Questions
# AquaForge regAssist — Drinking Water Treatment Plant (DWTP) Demo
# Version: 3.0
# Scope: Drinking water production only — process wastewater explicitly excluded
# Jurisdiction: Agnostic (global, North America primary)
# Date: 2026-06-09
#
# CHANGES FROM v2.0 (aligned with project_intake.canonical.yaml v0.2.2 + project_intake_en-CA.yaml):
#   1. writes_to fields added to all questions — maps to project data model
#   2. Option IDs use id: convention (not value:) — matches canonical reference
#   3. Capacity thresholds corrected: micro < 10 m³/day, small 10–500, medium 500–10,000, large 10,000–100,000
#   4. downstream_drinking_water_intake added — source water protection trigger
#   5. sensitive_zones added — affects raw water intake obligations
#   6. discharge_type excluded — consciously: no process wastewater discharge in scope
#   7. water_families entry gate added — drinking_water pre-selected/locked, reflects canonical structure

---

## ARCHITECTURE OVERVIEW

6 steps, 37 questions total (base + conditional)

| Step | Theme                          | Questions     |
|------|-------------------------------|---------------|
| 0    | Location                      | GPS + confirm |
| 1    | Project characterization      | Q1–Q6         |
| 2    | Raw water source              | Q7–Q12        |
| 3    | Raw water quality             | Q13–Q16       |
| 4    | Treatment train               | Q17–Q26       |
| 5    | Regulatory & pipeline output  | Q27–Q30       |

---

## SCOPE EXCLUSION NOTE

The following are explicitly OUT OF SCOPE:
- Filter backwash water (regulated_medium: backwash_wastewater)
- Sedimentation sludge / coagulation residuals (regulated_medium: sludge)
- Membrane concentrate / reject (regulated_medium: brine_concentrate)
- Any process wastewater discharge

discharge_type is excluded by design — no process wastewater discharge occurs
within this questionnaire's scope. Distribution of treated drinking water to
users is captured by Q27 distribution_system.

---

## CANONICAL MAPPING REFERENCE

Aligned with:
- ontology_canonical.yaml v0.2.0
- project_intake.canonical.yaml v0.2.2 (writes_to, id: convention, option IDs)

use_case (primary):          drinking_water_treatment
use_case (conditional):      drinking_water_distribution, source_water_intake,
                             water_abstraction_allocation

subdomains (always):         drinking_water, water_abstraction_allocation
subdomains (conditional):    source_water_protection, surface_water, groundwater

regulated_media (always):    source_water, raw_water, treated_drinking_water
regulated_media (conditional): distribution_water, tap_water

activities (always):         abstraction, treatment, reporting, recordkeeping
activities (conditional):    design_sizing, monitoring, storage, permitting_approval

compliance_points (always):  raw_water_intake, treatment_plant_inlet, post_treatment
compliance_points (cond.):   entry_point_to_distribution, distribution_system, customer_tap

obligation_types:            treatment, design, monitoring, operational, reporting

---

## STEP 0 — LOCATION

### Location (map UI)
- **Type:** map_picker + confirm button
- **writes_to:** project.location
- **Behavior:** Soft start (non-blocking on load), hard block at submit
- **Stores:** latitude, longitude, jurisdiction_hint
- **Pipeline use:** feeds jurisdiction_discovery stage

---

## STEP 1 — PROJECT CHARACTERIZATION

### Q1 — promoter_type
**Text:** What type of organization is leading this project?
**Type:** radio
**Required:** yes
**writes_to:** project.promoter_type
**Help:** The promoter type determines which regulatory regimes apply.
**Options:**
- `municipal` — Municipal authority / public water utility
- `industrial` — Industrial company (sector to be specified)
- `private_utility` — Private operator / concession holder
- `institutional` — Institutional facility (hospital, university, campus, military)
- `federal_government` — Federal or national government agency
- `real_estate_developer` — Real estate developer
- `other` — Other

### Q1b — industrial_sector
**Text:** What is the primary industrial sector?
**Type:** multi_select
**Required:** yes
**writes_to:** project.industrial_sector
**Condition:** required_if: promoter_type equals industrial
**Note:** Discovery/classification accelerator only — not an applicability axis.
**Options:**
- `food_beverage` — Food and beverage processing
- `chemical_pharma` — Chemical and pharmaceutical manufacturing
- `semiconductor_electronics` — Semiconductor and electronics manufacturing
- `mining_metals` — Mining, quarrying and metal processing
- `petroleum_refining` — Petroleum refining and petrochemicals
- `power_generation` — Power generation (thermal, nuclear, hydro)
- `other_industrial` — Other industrial sector

### Q2 — project_phase
**Text:** What phase is the project in?
**Type:** radio
**Required:** yes
**writes_to:** project.phase
**Options:**
- `feasibility_predesign` — Feasibility study / pre-design
- `detailed_design` — Detailed engineering design
- `new_construction` — New project — construction
- `expansion` — Expansion / capacity increase
- `retrofit_upgrade` — Rehabilitation / technology upgrade
- `operation` — Operation of an existing system
- `unknown` — Unknown / to be determined

### Q3 — project_capacity
**Text:** What is the nominal treatment or production capacity?
**Type:** radio
**Required:** yes
**writes_to:** project.capacity_range
**Help:** Capacity thresholds determine mandatory EIA obligations, operator
certification class, and monitoring frequency requirements.
**Options:**
- `micro` — < 10 m³/day (approx. < 100 PE) — decentralized, single buildings
- `small` — 10–500 m³/day (approx. 100–5,000 PE) — small communities, light industrial
- `medium` — 500–10,000 m³/day (approx. 5,000–100,000 PE) — mid-size communities
- `large` — 10,000–100,000 m³/day (approx. 100,000–1,000,000 PE) — large cities
- `very_large` — > 100,000 m³/day (> 1,000,000 PE) — major metropolitan areas
- `unknown` — Not yet determined / to be assessed

### Q4 — project_nature
**Text:** What best describes the nature of this project?
**Type:** radio
**Required:** yes
**writes_to:** project.nature
**Options:**
- `new_greenfield` — New greenfield plant (no existing infrastructure)
- `new_brownfield` — New plant on existing site (brownfield)
- `upgrade_existing` — Upgrade / retrofit of existing treatment process
- `capacity_expansion` — Capacity expansion (adding parallel treatment trains)
- `emergency_interim` — Emergency or interim treatment system

### Q5 — water_families
**Text:** Which water scopes are part of this project?
**Type:** multi_select
**Required:** yes
**writes_to:** classification.water_families
**Help:** drinking_water is pre-selected and locked for this questionnaire.
**Note:** Entry gate aligned with project_intake.canonical.yaml structure.
drinking_water locked; other scopes visible but not expected for this demo.
**Options:**
- `drinking_water` — Drinking water (production, treatment, distribution) [pre-selected, locked]
- `other_unsure` — Other / not sure — describe in the final question

### Q6 — drinking_water_subscopes
**Text:** Which drinking water scopes apply?
**Type:** multi_select
**Required:** yes
**writes_to:** classification.drinking_water_subscopes
**Condition:** required_if: water_families any_selected [drinking_water]
**Note:** drinking_water_treatment always pre-selected and locked.
**Options:**
- `drinking_water_treatment` — Drinking water treatment plant (DWTP) [locked]
- `drinking_water_distribution` — Distribution network (pipes, storage tanks, pumping stations)
- `source_water_intake` — Raw water intake / abstraction point
- `desalination` — Desalination (seawater or brackish water)

---

## STEP 2 — RAW WATER SOURCE

### Q7 — water_source_type
**Text:** What is the nature of the raw water source?
**Type:** multi_select
**Required:** yes
**writes_to:** project.water_source
**Help:** Select all sources that will be abstracted or used.
**Canonical regulated_media:** source_water + surface_water OR groundwater
**Canonical subdomains:** surface_water OR groundwater (conditional)
**Options:**
- `river_stream` — River / stream (flowing surface water)
- `lake_reservoir` — Lake / reservoir (standing surface water)
- `large_lake_system` — Large lake system (Great Lakes, Lake Geneva, etc.)
- `ocean_coastal` — Ocean / coastal / estuarine water (desalination)
- `confined_aquifer` — Confined aquifer (artesian groundwater)
- `unconfined_aquifer` — Unconfined aquifer / water table
- `rainwater_harvesting` — Rainwater harvesting / rooftop collection
- `municipal_supply` — Pre-treated municipal water supply (no raw water abstraction on-site)

### Q8 — source_protection_zone
**Text:** Is the raw water intake within a formally designated source protection zone?
**Type:** radio
**Required:** yes
**writes_to:** project.source_protection_zone
**Canonical subdomain:** source_water_protection (if yes_tier*)
**Canonical compliance_point:** raw_water_intake
**Options:**
- `yes_tier1` — Yes — Tier 1 / highest protection (restricted watershed)
- `yes_tier2` — Yes — Tier 2 / moderate protection
- `yes_tier3` — Yes — Tier 3 / basic protection
- `no_designated` — No designated source protection zone
- `unknown` — Unknown / under assessment

### Q9 — downstream_drinking_water_intake
**Text:** Is there a drinking water intake downstream of or affected by this project's water abstraction point?
**Type:** radio
**Required:** yes
**writes_to:** project.receiving_environment.downstream_intake
**Help:** A downstream drinking water intake may trigger source water protection
obligations in most jurisdictions — even for abstraction-only projects.
**Canonical subdomain (if yes):** source_water_protection
**Note:** Present in project_intake.canonical.yaml — added in v3.0.
**Condition:** required_if: water_source_type any_selected
[river_stream, lake_reservoir, large_lake_system, ocean_coastal,
confined_aquifer, unconfined_aquifer]
**Options:**
- `yes_confirmed` — Yes — confirmed downstream drinking water intake
- `yes_suspected` — Probable but not confirmed
- `false` — No downstream drinking water intake identified
- `unknown` — Unknown

### Q10 — sensitive_zones
**Text:** Are any protected or environmentally sensitive zones affected by this project's water abstraction?
**Type:** multi_select
**Required:** no
**writes_to:** project.sensitive_zones
**Help:** Applies to raw water abstraction and intake location. Automatic
detection from GPS is performed in the background by regAssist.
**Note:** Present in project_intake.canonical.yaml — added in v3.0.
**Options:**
- `drinking_water_source_protection_area` — Drinking water source protection zone / wellhead protection area
- `protected_biodiversity_habitat` — Legally protected biodiversity / natural habitat zone
- `fish_aquatic_habitat` — Critical fish or aquatic species habitat
- `wetland_protected` — Protected wetland / marsh / bog
- `drinking_water_watershed` — Drinking water supply watershed / catchment area
- `floodplain_flood_risk_zone` — Floodplain / designated flood risk zone
- `transboundary_shared_water_body` — Transboundary or internationally shared water body
- `indigenous_traditional_territory` — Indigenous / First Nations traditional territory (duty to consult)
- `none_identified` — No sensitive or protected zones identified
- `unknown` — Unknown / requires verification

### Q11 — abstraction_permit_status
**Text:** What is the water abstraction / taking permit status?
**Type:** radio
**Required:** yes
**writes_to:** project.abstraction_permit_status
**Canonical activity:** abstraction, permitting_approval
**Options:**
- `existing_permit_valid` — Existing permit — valid and sufficient for planned capacity
- `existing_permit_amendment` — Existing permit — amendment required
- `new_permit_required` — New permit required
- `permit_not_required` — No permit required (jurisdiction-specific exemption)
- `unknown_permit` — Unknown / under assessment

### Q12 — source_regime
**Text:** What is the hydrological regime of the source?
**Type:** radio
**Required:** yes
**writes_to:** project.source_regime
**Condition:** required_if: water_source_type any_selected
[river_stream, lake_reservoir, large_lake_system]
**Options:**
- `perennial` — Perennial (flows year-round)
- `seasonal_intermittent` — Seasonal or intermittent (dry periods expected)
- `regulated_controlled` — Regulated / controlled (dam-managed flow)
- `tidal_influenced` — Tidally influenced (saltwater intrusion risk)

---

## STEP 3 — RAW WATER QUALITY

### Q13 — turbidity_range
**Text:** What is the typical raw water turbidity range?
**Type:** radio
**Required:** yes
**writes_to:** project.raw_water.turbidity_range
**Help:** NTU = Nephelometric Turbidity Units. Key driver of coagulation/filtration design.
**Canonical compliance_points:** raw_water_intake, treatment_plant_inlet
**Canonical obligation_types:** design, treatment
**Options:**
- `very_low` — Very low (< 1 NTU — groundwater or highly protected source)
- `low` — Low (1–10 NTU — clear lake or protected surface water)
- `moderate` — Moderate (10–100 NTU — typical river or lake)
- `high` — High (100–1,000 NTU — turbid river, post-storm)
- `very_high` — Very high (> 1,000 NTU — glacial or highly turbid source)
- `highly_variable` — Highly variable (seasonal extremes)
- `unknown_turbidity` — Unknown

### Q14 — microbial_risk
**Text:** What is the known or expected microbial risk level of the source water?
**Type:** radio
**Required:** yes
**writes_to:** project.raw_water.microbial_risk
**Help:** Informs required log-reduction credits (QMRA / multi-barrier approach).
**Canonical obligation_types:** treatment, monitoring
**Options:**
- `low` — Low (protected groundwater — minimal pathogen risk)
- `moderate` — Moderate (typical surface water — Giardia / Cryptosporidium risk)
- `high` — High (impacted source — upstream WWTP, CSO, agricultural runoff)
- `very_high` — Very high (highly impacted — known contamination events)
- `unknown_microbial` — Unknown / not assessed

### Q15 — chemical_concerns
**Text:** What chemical quality concerns are present or suspected in the raw water?
**Type:** multi_select
**Required:** no
**writes_to:** project.raw_water.chemical_concerns
**Help:** Drives advanced treatment selection and regAssist source targeting.
**Options:**
- `high_nom` — High natural organic matter (NOM — DBP precursors)
- `hardness_scaling` — Hardness / scaling potential (Ca, Mg)
- `iron_manganese` — Iron and/or manganese (Fe/Mn)
- `arsenic` — Arsenic (As)
- `nitrates` — Nitrates (NO₃⁻)
- `fluoride` — Fluoride — excess
- `pfas` — PFAS (per- and polyfluoroalkyl substances)
- `taste_odour` — Taste and odour (geosmin, MIB)
- `heavy_metals` — Heavy metals (Pb, Cd, Cr, etc.)
- `pesticides_herbicides` — Pesticides / herbicides
- `pharmaceuticals` — Pharmaceuticals / CECs
- `salinity_tds` — Salinity / high TDS (> 500 mg/L)
- `none_known_chem` — No significant chemical concerns known

### Q16 — source_variability
**Text:** How would you characterize raw water quality variability over time?
**Type:** radio
**Required:** yes
**writes_to:** project.raw_water.variability
**Options:**
- `stable` — Stable (groundwater or highly regulated surface source)
- `seasonal` — Seasonal variation (spring snowmelt, fall lake turnover)
- `event_driven` — Event-driven (storm events cause major quality shifts)
- `highly_variable` — Highly variable / unpredictable

---

## STEP 4 — TREATMENT TRAIN

All questions in this step:
- **Canonical activity:** treatment
- **Canonical compliance_points:** treatment_plant_inlet → post_treatment

### Q17 — pre_treatment
**Text:** Does the project include pre-treatment before the main process?
**Type:** multi_select
**Required:** no
**writes_to:** classification.treatment_train.pre_treatment
**Options:**
- `screening_grit` — Screening and grit removal
- `pre_sedimentation` — Pre-sedimentation / settling basin
- `pre_chlorination` — Pre-chlorination (algae control, Fe/Mn oxidation)
- `pre_ozonation` — Pre-ozonation (colour, taste/odour, micropollutants)
- `aeration` — Aeration (Fe/Mn, CO₂, H₂S — mainly groundwater)
- `bank_filtration` — River bank filtration / managed aquifer recharge (MAR)
- `none_pretreatment` — No pre-treatment

### Q18 — coagulation_flocculation
**Text:** Does the project include coagulation / flocculation / sedimentation?
**Type:** radio
**Required:** yes
**writes_to:** classification.treatment_train.coagulation_flocculation
**Canonical obligation_types:** treatment, operational
**Options:**
- `yes_conventional` — Yes — conventional (rapid mix + flocculation + sedimentation)
- `yes_dissolved_air` — Yes — dissolved air flotation (DAF)
- `yes_ballasted` — Yes — ballasted flocculation (Actiflo®, CoMag®)
- `no_coagulation` — No coagulation / flocculation

### Q18a — coagulant_type
**Text:** What is the primary coagulant type?
**Type:** radio
**Required:** yes
**writes_to:** classification.treatment_train.coagulant_type
**Condition:** required_if: coagulation_flocculation any_selected
[yes_conventional, yes_dissolved_air, yes_ballasted]
**Options:**
- `alum` — Aluminum sulfate — alum (Al₂(SO₄)₃)
- `pac` — Polyaluminum chloride (PACl)
- `ferric_chloride` — Ferric chloride (FeCl₃)
- `ferric_sulfate` — Ferric sulfate (Fe₂(SO₄)₃)
- `combined_coagulants` — Combination of coagulants
- `other_coagulant` — Other / not yet selected

### Q18b — sedimentation_type
**Text:** What type of sedimentation basin is used?
**Type:** radio
**Required:** no
**writes_to:** classification.treatment_train.sedimentation_type
**Condition:** required_if: coagulation_flocculation any_selected
[yes_conventional, yes_ballasted]
**Options:**
- `conventional_basin` — Conventional horizontal-flow settling basin
- `lamella_settler` — Lamella / inclined plate settler
- `sludge_blanket` — Sludge blanket clarifier (ACCELATOR®, Pulsator®)
- `other_sedimentation` — Other

### Q19 — filtration
**Text:** What filtration technology is used in this project?
**Type:** multi_select
**Required:** yes
**writes_to:** classification.treatment_train.filtration
**Canonical compliance_point:** post_treatment
**Mutual exclusion (BUG-01):** no_filtration mutually exclusive with all technology options.
Classification output: filtration_technologies[] + no_filtration_flag.
**Options:**
- `rapid_sand_filter` — Rapid sand filtration (RSF)
- `dual_media_filter` — Dual-media filtration (anthracite + sand)
- `slow_sand_filter` — Slow sand filtration (SSF — biological layer)
- `gac_filter` — Granular activated carbon (GAC) filtration
- `pressure_filter` — Pressure filtration
- `ultrafiltration` — Ultrafiltration (UF — 0.01–0.1 µm)
- `microfiltration` — Microfiltration (MF — 0.1–10 µm)
- `no_filtration` — No filtration (disinfection only — groundwater not under direct influence) ⚠️ mutually exclusive

### Q19a — membrane_module_config
**Text:** What is the membrane module configuration?
**Type:** radio
**Required:** yes
**writes_to:** classification.treatment_train.membrane_module_config
**Condition:** required_if: filtration any_selected [ultrafiltration, microfiltration]
**Options:**
- `hollow_fiber` — Hollow fiber (submerged or pressurized)
- `spiral_wound` — Spiral wound
- `ceramic` — Ceramic membrane
- `other_membrane_config` — Other

### Q19b — membrane_integrity_testing
**Text:** Is membrane integrity testing (MIT) planned or implemented?
**Type:** radio
**Required:** yes
**writes_to:** classification.treatment_train.membrane_integrity_testing
**Condition:** required_if: filtration any_selected [ultrafiltration, microfiltration]
**Help:** MIT required for Cryptosporidium log-reduction credit (LRC) in North America.
**Canonical obligation_types:** monitoring, operational
**Options:**
- `yes_pressure_decay` — Yes — pressure decay test (PDT) — direct integrity test
- `yes_turbidity_lrc` — Yes — continuous turbidity / particle counting (indirect)
- `yes_both` — Yes — both direct and indirect
- `not_yet_determined` — Not yet determined
- `no_mit` — No — not planned

### Q20 — advanced_treatment
**Text:** Does the project include advanced treatment beyond conventional filtration?
**Type:** multi_select
**Required:** no
**writes_to:** classification.treatment_train.advanced_treatment
**Options:**
- `nanofiltration` — Nanofiltration (NF — 1–10 nm)
- `reverse_osmosis` — Reverse osmosis (RO — < 1 nm)
- `activated_carbon_powder` — Powdered activated carbon (PAC — batch dosing)
- `advanced_oxidation` — Advanced oxidation process (AOP — O₃/H₂O₂, UV/H₂O₂)
- `ion_exchange` — Ion exchange (IX — nitrates, arsenic, hardness, PFAS)
- `biological_filtration` — Biological activated carbon (BAC) / biofiltration
- `none_advanced` — No advanced treatment

### Q20a — nf_ro_purpose
**Text:** What is the primary purpose of the NF / RO system?
**Type:** multi_select
**Required:** yes
**writes_to:** classification.treatment_train.nf_ro_purpose
**Condition:** required_if: advanced_treatment any_selected [nanofiltration, reverse_osmosis]
**Options:**
- `softening` — Softening (hardness removal)
- `nom_color_removal` — NOM / colour removal
- `desalination` — Desalination / TDS reduction
- `pfas_removal` — PFAS removal
- `nitrate_removal` — Nitrate removal
- `micropollutant_removal` — Micropollutant / pharmaceutical removal
- `other_nf_ro` — Other

### Q21 — disinfection
**Text:** What disinfection technology or technologies are used?
**Type:** multi_select
**Required:** yes
**writes_to:** classification.treatment_train.disinfection
**Help:** Select all — both primary and secondary (residual) disinfection.
**Canonical compliance_points:** post_treatment, entry_point_to_distribution
**Canonical obligation_types:** treatment, operational, monitoring
**Options:**
- `chlorine_gas` — Chlorine gas (Cl₂)
- `sodium_hypochlorite` — Sodium hypochlorite (NaOCl)
- `calcium_hypochlorite` — Calcium hypochlorite (Ca(OCl)₂)
- `chloramines` — Chloramination (NH₂Cl — secondary residual)
- `chlorine_dioxide` — Chlorine dioxide (ClO₂)
- `ozone` — Ozone (O₃)
- `uv_lpho` — UV — Low-pressure high-output (LPHO)
- `uv_mp` — UV — Medium-pressure (MP)
- `uv_led` — UV — LED (emerging)
- `no_disinfection` — No disinfection

### Q21a — dbp_concern
**Text:** Is disinfection by-product (DBP) formation a known concern for this source?
**Type:** radio
**Required:** yes
**writes_to:** classification.treatment_train.dbp_concern
**Condition:** required_if: disinfection any_selected
[chlorine_gas, sodium_hypochlorite, calcium_hypochlorite, chloramines, chlorine_dioxide]
**Help:** DBPs (THMs, HAAs) form when chlorine reacts with NOM.
**Canonical obligation_types:** monitoring, treatment
**Options:**
- `yes_high_nom` — Yes — high NOM source (high DBP formation potential)
- `yes_moderate` — Yes — moderate concern
- `no_low_risk` — No — low NOM, low DBP risk
- `unknown_dbp` — Unknown

### Q22 — ph_stabilization
**Text:** Does the treatment train include pH adjustment or chemical stabilization?
**Type:** multi_select
**Required:** no
**writes_to:** classification.treatment_train.ph_stabilization
**Options:**
- `coagulation_ph_adjustment` — pH adjustment for coagulation (acid or base)
- `lime_softening` — Lime softening (Ca(OH)₂)
- `post_treatment_ph` — Post-treatment pH correction (CO₂, lime, NaOH)
- `corrosion_inhibitor` — Corrosion inhibitor (orthophosphate, silicate)
- `fluoridation` — Fluoridation (NaF or H₂SiF₆)
- `none_ph` — None

### Q23 — instrumentation_scada
**Text:** What level of instrumentation and control is planned?
**Type:** radio
**Required:** yes
**writes_to:** classification.treatment_train.instrumentation_scada
**Canonical activities:** monitoring, operation_maintenance
**Canonical obligation_types:** operational, monitoring
**Options:**
- `manual_basic` — Manual / basic — local controls, limited automation
- `semi_automated` — Semi-automated — PLCs, local HMI, limited SCADA
- `full_scada` — Full SCADA — remote monitoring, automated control loops
- `smart_plant` — Smart plant / digital twin — AI-assisted process control

---

## STEP 5 — REGULATORY CONTEXT & PIPELINE OUTPUT

### Q24 — distribution_system
**Text:** Does this project include a distribution system or transmission main?
**Type:** radio
**Required:** yes
**writes_to:** classification.distribution_system
**Canonical use_case (if yes):** drinking_water_distribution
**Canonical compliance_points (if yes):** distribution_system, customer_tap
**Canonical regulated_media (if yes):** distribution_water, tap_water
**Options:**
- `yes_full_distribution` — Yes — full distribution network (pipes to end users)
- `yes_transmission_only` — Yes — transmission main only (bulk water transfer)
- `plant_only` — Plant only — water transferred at plant gate
- `onsite_only` — Onsite use only (no external distribution)

### Q25 — storage_type
**Text:** What type of treated water storage is included?
**Type:** multi_select
**Required:** no
**writes_to:** classification.storage_type
**Canonical activity:** storage
**Options:**
- `ground_reservoir` — Ground-level reservoir / clearwell (CT for disinfection)
- `elevated_tank` — Elevated storage tank / water tower
- `underground_reservoir` — Underground / buried reservoir
- `pressure_tank` — Pressure tank / hydropneumatic system (small systems)
- `no_storage` — No dedicated storage

### Q26 — regulatory_jurisdiction
**Text:** What is the primary regulatory jurisdiction for this project?
**Type:** multi_select
**Required:** yes
**writes_to:** project.regulatory_jurisdiction
**Help:** Feeds jurisdiction_discovery pipeline stage. Subdomains are auto-derived.
**Options:**
- `canada_federal` — Canada — Federal (GCDWQ — Health Canada)
- `canada_quebec` — Canada — Québec (RQEP — MELCCFP)
- `canada_ontario` — Canada — Ontario (SDWA — O. Reg. 170/03)
- `canada_bc` — Canada — British Columbia (Drinking Water Protection Act)
- `canada_alberta` — Canada — Alberta (Water Act / EPEA)
- `canada_other` — Canada — Other province or territory
- `usa_federal` — USA — Federal (SDWA — EPA NPDWR)
- `usa_state` — USA — State-level (specify in notes)
- `other_jurisdiction` — Other country / jurisdiction (specify in notes)

### Q27 — project_free_description
**Text:** Briefly describe anything important about the project.
**Type:** text_area
**Required:** no
**writes_to:** project.description
**Help:** Optional but recommended. Key water quality parameters, site constraints,
technologies under consideration, specific pollutants of concern (PFAS,
microplastics, heavy metals, pathogens), flow variability, regulatory history.
**Placeholder:** e.g., "Ontario — City of Hamilton, expansion 80,000→120,000 m³/day.
Source: Lake Ontario. Known issues: zebra mussel fouling, elevated NOM in spring."

---

## CLASSIFICATION OUTPUT CONTRACT

```yaml
classification:
  questionnaire_id: dwtp_intake_v3
  questionnaire_version: "3.0"
  location:
    latitude: float
    longitude: float
    jurisdiction_hint: string
  use_cases:
    - drinking_water_treatment                 # always
    - source_water_intake                      # if Q6 includes source_water_intake
    - drinking_water_distribution              # if Q24 in [yes_full_distribution, yes_transmission_only]
    - water_abstraction_allocation             # if Q11 = new_permit_required
  subdomains:
    - drinking_water                           # always
    - water_abstraction_allocation             # always
    - source_water_protection                  # if Q8 = yes_tier* OR Q9 = yes_confirmed/yes_suspected
    - surface_water                            # if Q7 any_selected [river_stream, lake_reservoir, large_lake_system, ocean_coastal]
    - groundwater                              # if Q7 any_selected [confined_aquifer, unconfined_aquifer]
  regulated_media:
    - source_water
    - raw_water
    - treated_drinking_water
    - distribution_water                       # if Q24 in [yes_full_distribution, yes_transmission_only]
    - tap_water                                # if Q24 = yes_full_distribution
  activities:
    - abstraction
    - treatment
    - reporting
    - recordkeeping
    - design_sizing                            # if Q2 in [feasibility_predesign, detailed_design]
    - monitoring                               # if Q23 != manual_basic
    - storage                                  # if Q25 not includes no_storage
    - permitting_approval                      # if Q11 != existing_permit_valid
  compliance_points:
    - raw_water_intake
    - treatment_plant_inlet
    - post_treatment
    - entry_point_to_distribution              # if Q25 not includes no_storage
    - distribution_system                      # if Q24 = yes_full_distribution
    - customer_tap                             # if Q24 = yes_full_distribution
  obligation_types:
    - treatment
    - design
    - monitoring
    - operational
    - reporting
  project_context:
    promoter_type: string                      # Q1
    industrial_sector: []                      # Q1b (if applicable)
    project_phase: string                      # Q2
    project_capacity: string                   # Q3
    project_nature: string                     # Q4
    water_families: []                         # Q5
    drinking_water_subscopes: []               # Q6
  source:
    water_source_type: []                      # Q7
    source_protection_zone: string             # Q8
    downstream_drinking_water_intake: string   # Q9
    sensitive_zones: []                        # Q10
    abstraction_permit_status: string          # Q11
    source_regime: string                      # Q12 (SW only)
    turbidity_range: string                    # Q13
    microbial_risk: string                     # Q14
    chemical_concerns: []                      # Q15
    source_variability: string                 # Q16
  treatment_train:
    pre_treatment: []                          # Q17
    coagulation_flocculation: string           # Q18
    coagulant_type: string                     # Q18a (conditional)
    sedimentation_type: string                 # Q18b (conditional)
    filtration_technologies: []                # Q19 (no_filtration excluded)
    no_filtration_flag: bool                   # Q19
    membrane_module_config: string             # Q19a (conditional)
    membrane_integrity_testing: string         # Q19b (conditional)
    advanced_treatment: []                     # Q20
    nf_ro_purpose: []                          # Q20a (conditional)
    disinfection: []                           # Q21
    dbp_concern: string                        # Q21a (conditional)
    ph_stabilization: []                       # Q22
    instrumentation_scada: string              # Q23
  distribution:
    distribution_system: string                # Q24
    storage_type: []                           # Q25
  regulatory:
    jurisdictions: []                          # Q26
    project_free_description: string           # Q27
```

---

## KEY DESIGN DECISIONS (v3.0)

1. **Process wastewater excluded** — backwash, sludge, brine: out of scope
2. **discharge_type excluded** — conscious decision: no process WW discharge in scope
3. **writes_to on all questions** — aligned with project_intake.canonical.yaml convention
4. **id: convention for options** — aligned with canonical reference (not value:)
5. **Capacity thresholds corrected** — micro < 10, small 10–500, medium 500–10,000, large 10,000–100,000 m³/day
6. **water_families entry gate** — drinking_water pre-selected/locked, aligned with canonical structure
7. **downstream_drinking_water_intake added** — source water protection trigger (Q9)
8. **sensitive_zones added** — raw water abstraction context (Q10)
9. **Canonical IDs verbatim** — all use_case, subdomain, regulated_media, activity, compliance_point, obligation_type from ontology_canonical.yaml v0.2.0
10. **BUG-01 (filtration mutual exclusion)** — no_filtration mutually exclusive with technology options
11. **Acceptance gate compliance** — subdomains[] always includes drinking_water

---
*End of plan_questions.md v3.0*
