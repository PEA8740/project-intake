# plan_questions.md — Nouveau questionnaire d'intake AquaForge regAssist

## Métadonnées du fichier cible

```
id: water_project_intake_v2
version: 0.2.0
domain: water
status: draft
locale_default: en
```

---

## Objectif métier du questionnaire

Guider un ingénieur ou consultant en eau potable / eaux usées à identifier
la réglementation applicable à son projet, en fonction de :
1. La **juridiction** (pays → province → municipalité)
2. Le **type de promoteur** et le **secteur industriel** si applicable
3. Le **scope technique** du projet (eau potable, EU municipales, EU industrielles, etc.)
4. Le **type de rejet** : direct (milieu naturel) ou indirect (réseau municipal)
5. La **nature du milieu récepteur** (rivière, lac, océan, nappe, égout sanitaire, réseau pluvial)
6. La **capacité nominale** du projet (seuils de permis et surveillance)

---

## Architecture générale — 6 étapes

```
ÉTAPE 0  Localisation                  (bloquante — avant tout)
ÉTAPE 1  Caractérisation du projet     (promoteur, phase, capacité, secteur)
ÉTAPE 2  Scopes principaux             (water families reformulées)
ÉTAPE 3  Sous-scopes détaillés         (par scope sélectionné, dans l'ordre)
ÉTAPE 4  Source & milieu récepteur     (type rejet, milieu, zones sensibles)
ÉTAPE 5  Filières, flux & activités    (chaîne logique complète)
```

> **Règle de navigation multi-scope :** pour chaque scope coché en ÉTAPE 2,
> une question de sous-scope est générée dans l'ordre de sélection de
> l'utilisateur — PAS dans l'ordre fixe de la liste.

---

## ÉTAPE 0 — Localisation (pré-questionnaire, bloquante)

> Cette étape est obligatoire. L'accès au questionnaire est bloqué tant que
> la localisation n'est pas validée. Elle se fait via la carte interactive
> déjà présente dans l'UI + saisie textuelle en fallback.

### Champs capturés (pas des questions YAML — gérés par l'UI carte)

- **Pays** (obligatoire) — ex. Canada, USA, France
- **Province / État / Région** (obligatoire) — ex. Ontario, Québec, California
- **Municipalité / Ville** (obligatoire) — ex. Toronto, Montréal, Lyon
- **Coordonnées GPS** (auto-détectées depuis la carte ou saisie manuelle)
- **Milieu récepteur auto-détecté** depuis les coordonnées GPS :
  - Type : rivière / lac / Grands Lacs / océan / côtier / nappe phréatique / aucun identifié
  - Nom du milieu (si détecté)
  - Distance approximative (km)
  - Confirmation utilisateur obligatoire (oui / non / entrer manuellement)

> **Correction critique :** le bug «No surface water body found nearby» pour
> Toronto (sur le Lac Ontario) doit être corrigé avant déploiement. La
> détection doit couvrir les lacs, Grands Lacs, zones côtières et cours
> d'eau saisonniers.

**writes_to :** `project.location.country`, `project.location.province`,
`project.location.municipality`, `project.location.coordinates`,
`project.receiving_environment.auto_detected`

---

## ÉTAPE 1 — Caractérisation du projet

### Q1 — Type de promoteur
```
id: promoter_type
type: radio
required: true
writes_to: project.promoter_type
```
Options :
- `municipal` — Autorité municipale / régie publique d'eau
- `industrial` — Entreprise industrielle (secteur à préciser en Q1b)
- `private_utility` — Opérateur privé / concessionnaire
- `institutional` — Hôpital, université, campus, installation militaire
- `agricultural` — Exploitant agricole / aquacole
- `government_federal` — Agence gouvernementale fédérale
- `developer` — Promoteur immobilier (développement)
- `other` — Autre (préciser en description libre)

**Condition déclenchée :** si `industrial` → afficher Q1b (secteur industriel)

---

### Q1b — Secteur industriel *(conditionnel Q1 = industrial)*
```
id: industrial_sector
type: multi_select
required_if:
  equals:
    question: promoter_type
    value: industrial
writes_to: project.industrial_sector
```
Options (codes NAICS/NACE intégrés dans ontology_refs) :
- `food_beverage` — Agroalimentaire / boissons
- `pulp_paper` — Pâtes et papiers
- `mining_metal` — Mines et métaux
- `chemical_pharma` — Chimie / pharmaceutique
- `petroleum_refining` — Raffinage pétrolier
- `textile` — Textile / tannerie
- `power_generation` — Production d'énergie (refroidissement)
- `semiconductor_electronics` — Semi-conducteurs / électronique
- `hospital_healthcare` — Hôpital / soins de santé (micropolluants)
- `other_industrial` — Autre secteur industriel (préciser)

---

### Q2 — Phase du projet
```
id: project_phase
type: radio
required: true
writes_to: project.phase
```
Options (dans l'ordre chronologique du cycle de vie) :
- `feasibility_predesign` — Faisabilité / pré-design *(le plus fréquent pour mapping réglementaire)*
- `detailed_design` — Conception détaillée
- `new_project` — Nouveau projet — construction
- `expansion` — Expansion / augmentation de capacité
- `retrofit_upgrade` — Réhabilitation / mise à niveau
- `operation` — Opération d'un système existant
- `decommissioning` — Déclassement / fermeture
- `unknown` — Inconnu / à déterminer

---

### Q3 — Capacité nominale du projet
```
id: project_capacity
type: radio
required: true
writes_to: project.capacity_range
```
Options (seuils réglementaires standards) :
- `micro` — < 10 m³/j (systèmes décentralisés, petits bâtiments)
- `small` — 10 – 500 m³/j (petites collectivités, sites industriels légers)
- `medium` — 500 – 10 000 m³/j (collectivités moyennes, industries modérées)
- `large` — 10 000 – 100 000 m³/j (grandes villes, industries lourdes)
- `very_large` — > 100 000 m³/j (métropoles, grands sites industriels)
- `unknown` — Non déterminée / à évaluer

---

## ÉTAPE 2 — Scopes principaux (water families)

### Q4 — Scopes eau du projet
```
id: water_families
type: multi_select
required: true
writes_to: classification.water_families
```

> **Règle de navigation :** chaque option cochée génère sa propre question
> de sous-scope en ÉTAPE 3, dans l'ordre exact de sélection.

Options :
- `drinking_water` — Eau potable (production, traitement, distribution)
  - ontology_refs.subdomains: [drinking_water, source_water_protection]
- `municipal_wastewater` — Eaux usées municipales / sanitaires
  - ontology_refs.subdomains: [municipal_wastewater, sewage_treatment]
- `industrial_wastewater` — Eaux usées industrielles (effluents de procédé)
  - ontology_refs.subdomains: [industrial_effluent, process_wastewater]
- `stormwater` — Eaux pluviales / ruissellement urbain
  - ontology_refs.subdomains: [stormwater, urban_runoff, construction_stormwater]
- `groundwater` — Eaux souterraines / aquifère
  - ontology_refs.subdomains: [groundwater, aquifer, dewatering]
- `water_reuse` — Réutilisation de l'eau traitée
  - ontology_refs.subdomains: [water_reuse, reclaimed_water, recycled_water]
- `residuals_biosolids` — Résidus / boues / biosolides
  - ontology_refs.subdomains: [biosolids, sludge_management, residuals]
- `other_unsure` — Autre / incertain (décrire en Q finale)

> **Retiré vs original :** «Source water / surface water» supprimé de Q4
> (c'est un type de source, pas un scope — il sera capturé en ÉTAPE 4).

---

## ÉTAPE 3 — Sous-scopes détaillés (par scope sélectionné)

> Ces questions sont générées dynamiquement pour CHAQUE scope coché en Q4,
> dans l'ordre de sélection de l'utilisateur.

---

### Q5 — Sous-scopes eau potable *(si drinking_water coché)*
```
id: drinking_water_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [drinking_water]
writes_to: classification.drinking_water_subscopes
```
Options :
- `drinking_water_treatment` — Traitement de l'eau potable (usine AEP)
  - ontology_refs.use_cases: [drinking_water_treatment]
- `drinking_water_distribution` — Réseau de distribution (conduites, réservoirs)
  - ontology_refs.use_cases: [distribution_network]
- `source_water_intake` — Captage / prise d'eau brute
  - ontology_refs.use_cases: [surface_water_intake, groundwater_well]
- `private_well_supply` — Alimentation par puits privé
  - ontology_refs.use_cases: [private_well]
- `desalination` — Dessalement (eau de mer ou eau saumâtre)
  - ontology_refs.use_cases: [desalination, seawater_treatment]

---

### Q6 — Sous-scopes eaux usées municipales *(si municipal_wastewater coché)*

> Cette question remplace la Q3 originale avec la matrice Source × Voie (A×B).

```
id: municipal_wastewater_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [municipal_wastewater]
writes_to: classification.municipal_wastewater_subscopes
```

**AXE A — Source de l'eau usée :**
- `municipal_residential` — Eaux usées domestiques / résidentielles / institutionnelles
  - ontology_refs.subdomains: [domestic_wastewater]
- `combined_sewer_overflow` — Débordements de réseau unitaire (CSO)
  - ontology_refs.subdomains: [combined_sewer, cso]
- `hospital_wastewater` — Eaux usées hospitalières (micropolluants, pharmaceutiques)
  - ontology_refs.subdomains: [hospital_wastewater, pharmaceutical_micropollutants]

**AXE B — Voie de traitement / rejet :**
- `centralized_wwtp` — Traitement centralisé en station d'épuration municipale (STEP/WWTP)
  - ontology_refs.use_cases: [municipal_wwtp]
- `pretreatment_to_sewer` — Prétraitement industriel avant raccordement à l'égout
  - ontology_refs.use_cases: [industrial_pretreatment]
- `decentralized_onsite` — Traitement décentralisé / sur site (fosse septique, package plant)
  - ontology_refs.use_cases: [onsite_septic, decentralized_treatment]
- `land_application_biosolids` — Application au sol (biosolides / épandage)
  - ontology_refs.use_cases: [biosolids_land_application]
- `direct_environmental_discharge` — Rejet direct en milieu naturel (après traitement)
  - ontology_refs.use_cases: [effluent_discharge, direct_discharge]

---

### Q7 — Sous-scopes eaux usées industrielles *(si industrial_wastewater coché)*
```
id: industrial_wastewater_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [industrial_wastewater]
writes_to: classification.industrial_wastewater_subscopes
```
Options :
- `process_effluent_surface_water` — Effluent de procédé rejeté directement en eau de surface
  - ontology_refs.use_cases: [industrial_effluent_discharge]
- `process_effluent_to_sewer` — Effluent industriel raccordé au réseau municipal (rejet indirect)
  - ontology_refs.use_cases: [industrial_pretreatment, indirect_discharge]
- `cooling_water_blowdown` — Eau de refroidissement / purge (tours de refroidissement)
  - ontology_refs.use_cases: [cooling_water_discharge]
- `landfill_leachate` — Lixiviats de décharges / sites d'enfouissement
  - ontology_refs.use_cases: [leachate_treatment]
- `agricultural_runoff` — Eaux de ruissellement agricoles / retours d'irrigation
  - ontology_refs.use_cases: [agricultural_runoff, irrigation_return]
- `aquaculture_effluent` — Effluents d'aquaculture / pisciculture
  - ontology_refs.use_cases: [aquaculture_effluent]

---

### Q8 — Sous-scopes eaux pluviales *(si stormwater coché)*
```
id: stormwater_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [stormwater]
writes_to: classification.stormwater_subscopes
```
Options :
- `urban_stormwater` — Gestion des eaux pluviales urbaines (bassins, noues, toitures vertes)
  - ontology_refs.subdomains: [urban_stormwater_management]
- `construction_site_runoff` — Ruissellement de chantier de construction
  - ontology_refs.subdomains: [construction_stormwater]
- `agricultural_stormwater` — Eaux pluviales en contexte agricole (AFO/CAFO)
  - ontology_refs.subdomains: [agricultural_runoff_afo]
- `industrial_site_stormwater` — Eaux pluviales de sites industriels
  - ontology_refs.subdomains: [industrial_stormwater]

---

### Q9 — Sous-scopes eaux souterraines *(si groundwater coché)*
```
id: groundwater_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [groundwater]
writes_to: classification.groundwater_subscopes
```
Options :
- `groundwater_withdrawal_well` — Captage / pompage d'eau souterraine (puits)
  - ontology_refs.use_cases: [groundwater_extraction]
- `aquifer_recharge` — Recharge artificielle d'aquifère
  - ontology_refs.use_cases: [managed_aquifer_recharge]
- `groundwater_remediation` — Réhabilitation / dépollution d'aquifère
  - ontology_refs.use_cases: [groundwater_remediation]
- `dewatering_excavation` — Rabattement de nappe (chantier, mine, excavation)
  - ontology_refs.use_cases: [groundwater_dewatering]
- `injection_well` — Puits d'injection (concentrat membranaire, réinjection)
  - ontology_refs.use_cases: [injection_well]

---

### Q10 — Sous-scopes réutilisation *(si water_reuse coché)*
```
id: water_reuse_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [water_reuse]
writes_to: classification.water_reuse_subscopes
```
Options :
- `potable_reuse_indirect` — Réutilisation potable indirecte (recharge aquifère, lac)
  - ontology_refs.use_cases: [indirect_potable_reuse]
- `potable_reuse_direct` — Réutilisation potable directe (injection réseau AEP)
  - ontology_refs.use_cases: [direct_potable_reuse]
- `non_potable_reuse_irrigation` — Réutilisation non potable — irrigation
  - ontology_refs.use_cases: [agricultural_reuse]
- `non_potable_reuse_industrial` — Réutilisation non potable — usage industriel
  - ontology_refs.use_cases: [industrial_reuse]
- `non_potable_reuse_urban` — Réutilisation non potable — urbain (chasses d'eau, arrosage)
  - ontology_refs.use_cases: [urban_reuse]

---

### Q11 — Sous-scopes résidus / boues *(si residuals_biosolids coché)*
```
id: residuals_subscopes
type: multi_select
required_if:
  any_selected:
    question: water_families
    values: [residuals_biosolids]
writes_to: classification.residuals_subscopes
```
Options :
- `biosolids_land_application` — Épandage agricole de biosolides
  - ontology_refs.use_cases: [biosolids_land_application]
- `biosolids_landfill` — Mise en décharge de boues
  - ontology_refs.use_cases: [biosolids_disposal]
- `thermal_drying_incineration` — Séchage thermique / incinération
  - ontology_refs.use_cases: [sludge_incineration]
- `sludge_composting` — Compostage de boues
  - ontology_refs.use_cases: [sludge_composting]
- `filter_media_spent_resin` — Médias filtrants usés / résines épuisées (GAC, sable, IX)
  - ontology_refs.use_cases: [spent_media_disposal]

---

## ÉTAPE 4 — Source & milieu récepteur

### Q12 — Nature de la source d'eau brute
```
id: water_source_type
type: multi_select
required: true
writes_to: project.water_source
```
Options :
- `river_stream` — Rivière / cours d'eau (eau de surface courante)
  - ontology_refs.subdomains: [surface_water, river]
- `lake_reservoir` — Lac / réservoir (eau de surface stagnante)
  - ontology_refs.subdomains: [surface_water, lake, reservoir]
- `great_lakes` — Grands Lacs (Ontario, Érié, Huron, Supérieur, Michigan)
  - ontology_refs.subdomains: [great_lakes, surface_water]
- `ocean_coastal` — Eau de mer / eau côtière (dessalement)
  - ontology_refs.subdomains: [seawater, coastal_water]
- `groundwater_confined` — Eau souterraine captive (aquifère captif)
  - ontology_refs.subdomains: [confined_aquifer]
- `groundwater_unconfined` — Eau souterraine libre (nappe phréatique)
  - ontology_refs.subdomains: [unconfined_aquifer]
- `municipal_supply` — Eau potable déjà traitée (réseau municipal)
  - ontology_refs.subdomains: [municipal_water_supply]
- `rainwater_harvesting` — Récupération d'eau de pluie
  - ontology_refs.subdomains: [rainwater_harvesting]
- `no_water_intake` — Pas de captage (projet de traitement / rejet uniquement)

---

### Q13 — Type de rejet (direct ou indirect) *(VARIABLE CLÉ)*
```
id: discharge_type
type: multi_select
required: true
writes_to: classification.discharge_type
```

> Cette question est la variable déterminante pour l'identification du régime
> réglementaire applicable. Un rejet direct déclenche les règlements fédéraux
> (Loi sur les pêches, Clean Water Act NPDES, Directive-cadre Eau EU) ;
> un rejet indirect déclenche les règlements municipaux de prétraitement.

Options :
- `direct_surface_water` — **Rejet direct** en eau de surface (rivière, lac, océan)
  - ontology_refs.regulatory_trigger: [fisheries_act_schedule, npdes_permit, wfd_eas]
- `direct_groundwater` — **Rejet direct** en nappe phréatique (puits d'injection, infiltration)
  - ontology_refs.regulatory_trigger: [groundwater_protection, uic_class]
- `indirect_sanitary_sewer` — **Rejet indirect** — égout sanitaire municipal
  - ontology_refs.regulatory_trigger: [municipal_sewer_bylaw, pretreatment_program]
- `indirect_storm_sewer` — **Rejet indirect** — réseau pluvial municipal
  - ontology_refs.regulatory_trigger: [stormwater_permit, ms4_permit]
- `land_application` — Application au sol (irrigation, épandage)
  - ontology_refs.regulatory_trigger: [land_application_permit, biosolids_regulation]
- `reuse_on_site` — Réutilisation sur site (pas de rejet externe)
  - ontology_refs.regulatory_trigger: [water_reuse_standard]
- `hauled_offsite_treatment` — Collecte et transport vers installation de traitement agréée
  - ontology_refs.regulatory_trigger: [waste_hauling_manifest]
- `no_discharge_closed_loop` — Aucun rejet — système en boucle fermée
- `unknown_to_determine` — Inconnu / à déterminer

---

### Q14 — Nature du milieu récepteur *(si rejet direct)*
```
id: receiving_environment_type
type: multi_select
required_if:
  any_selected:
    question: discharge_type
    values: [direct_surface_water, direct_groundwater]
writes_to: project.receiving_environment.type
```
Options :
- `river_perennial` — Rivière pérenne (écoulement permanent)
  - ontology_refs.subdomains: [river, perennial_stream]
- `river_intermittent` — Cours d'eau intermittent / saisonnier
  - ontology_refs.subdomains: [intermittent_stream]
- `lake_natural` — Lac naturel
  - ontology_refs.subdomains: [lake]
- `great_lakes_basin` — Bassin des Grands Lacs
  - ontology_refs.subdomains: [great_lakes, boundary_waters]
- `reservoir_drinking_water` — Réservoir servant à l'alimentation en eau potable en aval
  - ontology_refs.subdomains: [drinking_water_reservoir, source_protection]
- `coastal_marine` — Milieu côtier / marin (estuaire, baie, océan)
  - ontology_refs.subdomains: [marine_water, coastal_zone]
- `wetland_marsh` — Zone humide / marais / tourbière
  - ontology_refs.subdomains: [wetland, marsh]
- `groundwater_aquifer` — Aquifère (nappe souterraine)
  - ontology_refs.subdomains: [aquifer, groundwater]
- `auto_detected` — Milieu détecté automatiquement depuis les coordonnées GPS (voir ÉTAPE 0)

---

### Q15 — Prise d'eau potable en aval du rejet ?
```
id: downstream_drinking_water_intake
type: radio
required_if:
  any_selected:
    question: discharge_type
    values: [direct_surface_water]
writes_to: project.receiving_environment.downstream_intake
```
Options :
- `yes_known` — Oui, prise d'eau potable connue en aval
  - ontology_refs.regulatory_trigger: [source_water_protection, drinking_water_intake_zone]
- `yes_suspected` — Probable mais non confirmé
- `no` — Non, aucune prise d'eau en aval identifiée
- `unknown` — Inconnu

---

### Q16 — Zones protégées ou sensibles concernées ?
```
id: sensitive_zones
type: multi_select
required: true
writes_to: project.sensitive_zones
```

> La détection automatique depuis les coordonnées GPS est recommandée en
> complément de cette question (Source Protection Areas Ontario, Natura 2000,
> zones RAMSAR, habitats fauniques).

Options :
- `source_protection_area` — Zone de protection de l'eau de source (Ontario Clean Water Act, RQEP)
  - ontology_refs.regulatory_trigger: [source_protection_plan, clean_water_act_on]
- `ramsar_wetland` — Zone humide d'importance internationale (Convention de Ramsar)
  - ontology_refs.regulatory_trigger: [ramsar_convention]
- `natura_2000` — Zone Natura 2000 (Union européenne — Directive Habitats / Oiseaux)
  - ontology_refs.regulatory_trigger: [habitats_directive, birds_directive]
- `fish_habitat_critical` — Habitat du poisson critique (Loi sur les pêches Canada)
  - ontology_refs.regulatory_trigger: [fisheries_act_habitat, dfo_authorization]
- `drinking_water_watershed` — Bassin versant d'alimentation en eau potable
  - ontology_refs.regulatory_trigger: [watershed_protection, source_water_assessment]
- `floodplain` — Plaine inondable / zone à risque d'inondation
  - ontology_refs.regulatory_trigger: [floodplain_regulation, trca_permit]
- `indigenous_territory` — Territoire autochtone / obligation de consultation
  - ontology_refs.regulatory_trigger: [duty_to_consult, indigenous_rights]
- `none_identified` — Aucune zone sensible identifiée
- `unknown` — Inconnu / à vérifier

---

## ÉTAPE 5 — Filières, flux & activités

### Q17 — Flux d'eau impliqués dans le projet
```
id: water_streams
type: multi_select
required: true
writes_to: classification.water_streams
```

> Flux restructurés : flux critiques manquants ajoutés, redondances retirées.

Options (dans l'ordre de la chaîne de traitement) :

**— Entrées (influents) —**
- `raw_water` — Eau brute (eau de surface ou souterraine avant tout traitement)
  - ontology_refs.subdomains: [raw_water, influent]
- `raw_wastewater` — Eau usée brute (influent de STEP / WWTP)
  - ontology_refs.subdomains: [raw_wastewater, sewage]
- `industrial_process_water` — Eau de procédé industriel (entrante)
  - ontology_refs.subdomains: [process_water]

**— Flux internes de procédé —**
- `filter_backwash_water` — Eau de lavage à contre-courant (filtre rapide, ultrafiltration)
  - ontology_refs.subdomains: [filter_backwash, process_residuals]
- `membrane_concentrate_ro_reject` — Concentrat membranaire / rejet OI / NF
  - ontology_refs.subdomains: [membrane_concentrate, ro_reject, brine]
- `recycled_process_water` — Eau de procédé recyclée / recirculée en tête de filière
  - ontology_refs.subdomains: [process_recycle, internal_recycle]
- `disinfection_byproduct_streams` — Purges contenant des sous-produits de désinfection (THM, HAA, chloramines)
  - ontology_refs.subdomains: [disinfection_byproducts, dbp_control]
- `cooling_water` — Eau de refroidissement (entrante / circulante)
  - ontology_refs.subdomains: [cooling_water]

**— Sorties (effluents & résidus) —**
- `treated_drinking_water` — Eau potable traitée (eau distribuée conforme)
  - ontology_refs.subdomains: [finished_water, potable_water]
- `treated_wastewater_effluent` — Effluent de STEP traité (avant rejet ou réutilisation)
  - ontology_refs.subdomains: [treated_effluent, final_effluent]
- `sludge_biosolids` — Boues / biosolides (résidus de traitement)
  - ontology_refs.subdomains: [sludge, biosolids]
- `spent_filter_media_resin` — Médias filtrants usés / résines épuisées (GAC, sable, IX)
  - ontology_refs.subdomains: [spent_media, spent_resin]
- `stormwater_runoff` — Eaux pluviales / ruissellement (du site)
  - ontology_refs.subdomains: [stormwater, site_runoff]
- `leachate` — Lixiviat (décharge, site contaminé)
  - ontology_refs.subdomains: [leachate]

> **Retiré vs original :** «Construction runoff» retiré (hors-scope eau potable
> et WWTP). «Final effluent» fusionné dans «Treated wastewater effluent».
> «Process wastewater» clarifié et scindé en industrial_process_water et
> filter_backwash_water selon le contexte.

---

### Q18 — Activités du projet *(dans l'ordre logique de la chaîne)*
```
id: project_activities
type: multi_select
required: true
writes_to: classification.project_activities
```
Options (ordre : captage → traitement → stockage → transport → rejet → résidus → surveillance) :
- `water_abstraction_withdrawal` — Captage / pompage d'eau brute
  - ontology_refs.use_cases: [water_abstraction, water_withdrawal]
- `pretreatment` — Prétraitement (dégrillage, dessablage, déshuilage)
  - ontology_refs.use_cases: [pretreatment]
- `treatment` — Traitement principal (eau potable ou eaux usées)
  - ontology_refs.use_cases: [water_treatment, wastewater_treatment]
- `advanced_treatment` — Traitement avancé (ozonation, GAC, UV, membranes, procédés d'oxydation avancée)
  - ontology_refs.use_cases: [advanced_treatment, tertiary_treatment]
- `storage` — Stockage (réservoirs, bassins tampons, lagunes)
  - ontology_refs.use_cases: [water_storage, effluent_storage]
- `collection_conveyance` — Collecte et transport (réseaux, conduites, stations de pompage)
  - ontology_refs.use_cases: [collection_system, pumping_station]
- `discharge` — Rejet / déversement (effluent vers milieu récepteur ou réseau)
  - ontology_refs.use_cases: [effluent_discharge]
- `reuse` — Réutilisation de l'eau traitée
  - ontology_refs.use_cases: [water_reuse]
- `residuals_management` — Gestion des résidus (boues, médias, concentrats)
  - ontology_refs.use_cases: [residuals_management, sludge_handling]
- `monitoring_reporting` — Surveillance et rapportage (auto-surveillance, contrôle réglementaire)
  - ontology_refs.use_cases: [effluent_monitoring, compliance_reporting]

> **Retiré vs original :** «Design/sizing» retiré (phase d'ingénierie,
> pas une obligation réglementaire directe).

---

### Q19 — Impact sur les eaux souterraines ou un aquifère ?
```
id: groundwater_impact
type: multi_select
required: true
writes_to: classification.groundwater_impact
```
Options :
- `groundwater_withdrawal_well` — Oui — captage souterrain / puits de production
  - ontology_refs.use_cases: [groundwater_extraction, well_permit]
- `infiltration_recharge` — Oui — infiltration ou recharge (planifiée ou potentielle)
  - ontology_refs.use_cases: [managed_aquifer_recharge, infiltration]
- `onsite_septic_system` — Oui — système septique / traitement sur site avec infiltration
  - ontology_refs.use_cases: [onsite_septic, subsurface_disposal]
- `land_application_leaching` — Oui — application au sol avec potentiel de lixiviation
  - ontology_refs.use_cases: [land_application, percolation]
- `dewatering_remediation` — Oui — rabattement de nappe ou réhabilitation d'aquifère
  - ontology_refs.use_cases: [groundwater_dewatering, remediation]
- `leachate_residuals_risk` — Oui — résidus ou lixiviats susceptibles d'affecter la nappe
  - ontology_refs.use_cases: [leachate_risk, groundwater_contamination]
- `no_groundwater_impact` — **Non — aucun impact sur les eaux souterraines identifié**
  - *(option explicite absente de la version originale — bloque l'ambiguïté d'interprétation)*

> **Correction vs original :** ajout de l'option «No groundwater impact»
> explicite pour éviter que le système interprète une question sans réponse
> comme une donnée manquante.

---

### Q20 — Description libre du projet
```
id: project_free_description
type: text_area
required: false
writes_to: project.free_description
```
Placeholder suggéré :
> "Décrivez tout élément important non couvert par les questions précédentes :
> paramètres clés de qualité d'eau, contraintes de site, technologies envisagées,
> polluants spécifiques (ex. PFAS, microplastiques, métaux lourds), calendrier,
> ou toute autre information pertinente pour l'identification réglementaire."

> **Amélioration vs original :** le placeholder oriente vers des données
> parseable (paramètres, polluants, technologies) plutôt qu'une description
> générique. La position reste en fin de parcours, mais le moteur peut
> l'analyser avec NLP pour en extraire des mots-clés réglementaires.

---

## Récapitulatif — 20 questions, 6 étapes

| # | ID | Type | Étape | Conditionnel |
|---|---|---|---|---|
| 0 | localisation | UI carte | 0 | Non — bloquante |
| 1 | promoter_type | radio | 1 | Non |
| 1b | industrial_sector | multi_select | 1 | Si promoter_type = industrial |
| 2 | project_phase | radio | 1 | Non |
| 3 | project_capacity | radio | 1 | Non |
| 4 | water_families | multi_select | 2 | Non |
| 5 | drinking_water_subscopes | multi_select | 3 | Si drinking_water coché |
| 6 | municipal_wastewater_subscopes | multi_select | 3 | Si municipal_wastewater coché |
| 7 | industrial_wastewater_subscopes | multi_select | 3 | Si industrial_wastewater coché |
| 8 | stormwater_subscopes | multi_select | 3 | Si stormwater coché |
| 9 | groundwater_subscopes | multi_select | 3 | Si groundwater coché |
| 10 | water_reuse_subscopes | multi_select | 3 | Si water_reuse coché |
| 11 | residuals_subscopes | multi_select | 3 | Si residuals_biosolids coché |
| 12 | water_source_type | multi_select | 4 | Non |
| 13 | discharge_type | multi_select | 4 | Non — variable clé |
| 14 | receiving_environment_type | multi_select | 4 | Si rejet direct |
| 15 | downstream_drinking_water_intake | radio | 4 | Si direct_surface_water |
| 16 | sensitive_zones | multi_select | 4 | Non |
| 17 | water_streams | multi_select | 5 | Non |
| 18 | project_activities | multi_select | 5 | Non |
| 19 | groundwater_impact | multi_select | 5 | Non |
| 20 | project_free_description | text_area | 5 | Non |

---

## Notes pour Claude Code lors de la génération du YAML

1. **Respecter la structure canonique** du fichier `project_intake.canonical.yaml`
   de référence : métadonnées → condition_operators → question_types → questions.

2. **Chaque option** doit avoir un `id` (snake_case) et un bloc `ontology_refs`
   avec au moins `subdomains` ou `use_cases`.

3. **Les conditions `required_if`** utilisent la syntaxe `any_selected` avec
   `question` + `values` (liste). Ne pas utiliser `equals` sauf pour les
   questions radio (Q1 → Q1b).

4. **Ordre des questions dans le fichier** : respecter l'ordre des étapes 0→5
   et, dans chaque étape, l'ordre numérique des questions.

5. **Ne pas inclure les labels / textes UI** dans ce fichier canonique —
   ils appartiennent au fichier `project_intake.fr.yaml` (locale séparé).
