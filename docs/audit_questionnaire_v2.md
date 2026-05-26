# Audit complet — AquaForge Intake Questionnaire v2
# Date: 2026-05-25
# Méthode: simulation de 6 profils de projets réels

---

## PROFILS TESTÉS

| ID | Profil | Secteur | Discharge type |
|----|--------|---------|----------------|
| P1 | Restaurant avec séparateur de graisses | Institutional/Food service | Indirect — sanitary sewer |
| P2 | STEP municipale nouvelle construction | Municipal | Direct — surface water |
| P3 | Usine eau potable (UPEP) | Municipal | No discharge / closed loop partiel |
| P4 | Raffinerie pétrolière | Industrial | Direct + Indirect (mixte) |
| P5 | Système septique décentralisé (rural) | Agricultural | Land application |
| P6 | Réutilisation potable directe | Private utility | Reuse on-site |

---

## BUG CATALOGUE

---

### BUG-01 — Q17 Water streams : options non filtrées selon discharge type
**Sévérité : CRITIQUE**
**Profils affectés : P1, P3, P5, P6**

**Problème :**
La question Q17 "What water streams are involved?" présente TOUTES les options
à tous les projets, sans tenir compte du type de rejet sélectionné en Q13.

**Cas concrets :**

P1 (restaurant → égout) :
- Voit "Raw wastewater (WWTP influent)" → INCORRECT
  Un restaurant n'opère pas une STEP. Son flux entrant est "process wastewater",
  pas "WWTP influent".
- Voit "Treated wastewater effluent (final effluent)" → INCORRECT
  Il n'y a pas d'effluent final — le rejet va à l'égout, pas au milieu naturel.
- Voit "Membrane concentrate / RO reject" → HORS SCOPE
  Aucun système membranaire dans un restaurant standard.

P3 (UPEP — pas de rejet direct) :
- Voit "Raw wastewater (WWTP influent)" → INCORRECT
  Une UPEP traite de l'eau brute, pas des eaux usées.
- Voit "Treated wastewater effluent" → INCORRECT
  Une UPEP produit de l'eau potable, pas un effluent de STEP.

P5 (septique — land application) :
- Voit "Membrane concentrate / RO reject" → HORS SCOPE
- Voit "Disinfection by-product streams" → peu probable pour système rural

**Correction requise :**
Ajouter des conditions required_if sur les options de Q17 basées sur
la combinaison (water_families + discharge_type). Ou restructurer Q17
en sous-questions par scope (comme STEP 3).

---

### BUG-02 — Q18 Project activities : options non filtrées selon scope
**Sévérité : CRITIQUE**
**Profils affectés : P1, P3, P5**

**Problème :**
Q18 "What activities are part of this project?" présente toutes les activités
sans filtrage selon le scope eau sélectionné en Q4.

**Cas concrets :**

P1 (restaurant → égout) :
- Voit "Water abstraction / withdrawal" → INCORRECT
  Un restaurant ne capte pas d'eau brute — il est sur le réseau municipal.
- Voit "Treatment" → AMBIGU
  Le "prétraitement" (séparateur de graisses) n'est PAS un traitement
  au sens réglementaire. La distinction pretreatment vs treatment est critique.
- Voit "Discharge" → INCORRECT dans ce sens
  Le rejet va à l'égout, pas au milieu naturel. Le terme "discharge" implique
  un rejet environnemental dans le vocabulaire réglementaire.
- Voit "Reuse" → HORS SCOPE pour un restaurant standard.

P3 (UPEP) :
- Voit "Collection and conveyance (sewer network)" → INCORRECT
  Une UPEP n'opère pas un réseau d'égouts.
- Voit "Residuals management" → CORRECT seulement si boues de filtre
  présentes, mais pas toujours applicable.

**Correction requise :**
Filtrer Q18 selon water_families + discharge_type + project_activities
déjà sélectionnées. Séparer "pretreatment" de "treatment" avec des
libellés plus précis.

---

### BUG-03 — Q13 Discharge type : libellé "Discharge" ambigu pour rejet indirect
**Sévérité : MAJEURE**
**Profils affectés : P1, P4, P5**

**Problème :**
Dans Q18 (activités), l'option "Discharge / release (effluent to receiving
environment or sewer)" mélange deux réalités réglementaires opposées :
- Rejet au milieu naturel → déclenche permis d'effluent environnemental
- Rejet à l'égout → déclenche règlement de prétraitement municipal

Ces deux réalités ne doivent PAS être dans la même option.

**Correction requise :**
Scinder en deux options distinctes :
- "Environmental discharge" (rejet milieu naturel)
- "Sewer connection / indirect discharge" (raccordement égout)

---

### BUG-04 — Q4 Water families : "Industrial wastewater" absent pour P1
**Sévérité : MAJEURE**
**Profils affectés : P1**

**Problème :**
Un restaurant est classé "institutional" en Q1 (promoter type), mais ses
eaux de cuisine sont des eaux usées industrielles au sens réglementaire
(effluents avec graisses, DCO élevée, solides en suspension).

Le questionnaire ne guide pas l'utilisateur vers "industrial_wastewater"
pour un établissement de restauration. Il pourrait cocher uniquement
"municipal_wastewater" ce qui est INCORRECT réglementairement —
les règlements de prétraitement FSE (Food Service Establishment)
sont distincts des règlements EU municipaux standards.

**Correction requise :**
Ajouter un sous-scope spécifique dans municipal_wastewater_subscopes :
"Food service / commercial kitchen (grease, FOG)" avec ontology_refs
pointant vers les règlements FSE / intercepteur de graisses.
Ou ajouter une note d'aide contextuelle pour les établissements institutionnels.

---

### BUG-05 — Q15 Downstream intake : non posée pour rejet indirect à l'égout
**Sévérité : MAJEURE**
**Profils affectés : P1, P4 (rejet partiel indirect)**

**Problème :**
Q15 "Is there a downstream drinking water intake?" est conditionnelle
uniquement sur "direct_surface_water". Elle n'est pas posée pour les
rejets indirects.

Or, dans le cas d'un rejet indirect, la STEP municipale en aval peut
elle-même rejeter dans un cours d'eau avec une prise d'eau potable en aval.
Cette information est réglementairement pertinente pour certaines
juridictions (ex. Ontario Source Protection Plans).

**Correction requise :**
La question downstream_intake devrait aussi être posée (avec un libellé
adapté) quand l'utilisateur sélectionne indirect_sanitary_sewer,
en précisant : "La STEP municipale réceptrice décharge-t-elle dans
un cours d'eau avec prise d'eau potable en aval ?"

---

### BUG-06 — Q3 Project capacity : unité m³/jour inadaptée pour certains projets
**Sévérité : MINEURE**
**Profils affectés : P1, P5**

**Problème :**
Un restaurant produit typiquement 1–5 m³/jour d'eaux grasses.
La catégorie "micro (< 10 m³/day)" est correcte, mais l'unité m³/jour
n'est pas intuitive pour un restaurateur ou un ingénieur travaillant
sur des petits systèmes — qui pensent en L/jour ou en équivalents-habitants.

Pour P5 (septique rural), la capacité est souvent exprimée en
"équivalents-habitants" (EH) ou "population équivalente" (PE),
pas en m³/jour.

**Correction suggérée :**
Ajouter entre parenthèses les équivalences : "(< 10 m³/day ≈ < 100 PE)"
pour aider les non-spécialistes.

---

### BUG-07 — Q16 Sensitive zones : non conditionnelle mais toujours affichée
**Sévérité : MINEURE**
**Profils affectés : P1**

**Problème :**
Q16 "Sensitive zones" est required:true et toujours visible pour tous
les projets, y compris un restaurant urbain raccordé à l'égout.
Pour un tel projet, la question des zones sensibles est peu pertinente
et alourdit inutilement le parcours.

**Correction suggérée :**
Rendre Q16 conditionnelle :
- Toujours posée si discharge_type inclut direct_surface_water,
  direct_groundwater, ou land_application
- Optionnelle (required:false) si discharge_type = indirect_sanitary_sewer
  uniquement

---

### BUG-08 — Q19 Groundwater impact : option "No groundwater impact" insuffisante
**Sévérité : MINEURE**
**Profils affectés : P1, P2**

**Problème :**
L'option "No — no groundwater impact identified" existe (correction
qu'on avait faite), mais elle n'est pas mutuellement exclusive avec
les autres options dans l'UI. Un utilisateur pourrait cocher à la fois
"Yes — infiltration recharge" ET "No groundwater impact" par erreur.

**Correction requise :**
Implémenter une logique d'exclusion mutuelle dans le frontend :
si "no_groundwater_impact" est coché, décocher automatiquement
toutes les autres options, et vice versa.

---

### BUG-09 — Navigation STEP 3 : sous-scopes affichés même si non pertinents
**Sévérité : MAJEURE**
**Profils affectés : P1**

**Problème :**
P1 (restaurant) cochera probablement "municipal_wastewater" en Q4.
Q6 (municipal_wastewater_subscopes) lui proposera entre autres :
- "Combined sewer overflow (CSO)" → HORS SCOPE pour un restaurant
- "Hospital / healthcare wastewater" → HORS SCOPE
- "Centralized municipal wastewater treatment plant (WWTP)" → HORS SCOPE
  (c'est la ville qui opère la STEP, pas le restaurant)

Un ingénieur novice pourrait cocher "centralized_wwtp" par confusion,
pensant que c'est là où ses eaux vont — alors que ça désigne l'opérateur
de la STEP, pas le raccordement à l'égout.

**Correction requise :**
Ajouter un sous-scope dédié dans municipal_wastewater_subscopes :
- "Commercial / institutional discharge to municipal sewer (indirect)"
  avec note : "The facility connects to the municipal sewer system.
  The municipality operates the downstream WWTP."
Clarifier que "centralized_wwtp" = être l'opérateur de la STEP.

---

### BUG-10 — Q12 Water source : absent pour projets sans captage mais sur réseau
**Sévérité : MINEURE**
**Profils affectés : P1, P4 partiel**

**Problème :**
Q12 propose "Municipal supply (pre-treated utility feed)" et
"No water intake" — mais pour un restaurant, ni l'un ni l'autre
n'est exactement juste :
- Il est alimenté par le réseau municipal → "municipal_supply" est correct
- Mais "No water intake" suggère un projet de traitement pur

Le libellé "No water intake — discharge or treatment project only"
est trompeur pour P1 qui a bien une entrée d'eau (réseau municipal)
mais pas de captage propre.

**Correction suggérée :**
Renommer "No water intake" en "No raw water abstraction — facility
supplied by municipal distribution network" pour plus de précision.

---

## RÉSUMÉ DE L'AUDIT

| Bug ID | Description | Sévérité | Profils |
|--------|-------------|----------|---------|
| BUG-01 | Q17 Water streams non filtrées / discharge type | CRITIQUE | P1,P3,P5,P6 |
| BUG-02 | Q18 Activities non filtrées / scope | CRITIQUE | P1,P3,P5 |
| BUG-03 | Terme "Discharge" ambigu (direct vs indirect) | MAJEURE | P1,P4,P5 |
| BUG-04 | FSE/restaurant non guidé vers bon scope | MAJEURE | P1 |
| BUG-05 | Q15 downstream intake manquant pour rejet indirect | MAJEURE | P1,P4 |
| BUG-06 | Unité m³/jour non intuitive petits projets | MINEURE | P1,P5 |
| BUG-07 | Q16 sensitive zones toujours obligatoire | MINEURE | P1 |
| BUG-08 | Q19 "No groundwater" non exclusif mutuellement | MINEURE | P1,P2 |
| BUG-09 | Q6 sous-scopes WWTP confus pour raccordement égout | MAJEURE | P1 |
| BUG-10 | Q12 libellé "No water intake" trompeur | MINEURE | P1,P4 |

### Priorités de correction

**P1 — Corrections bloquantes (à faire avant tout déploiement)**
- BUG-01 : filtrage Q17 par discharge_type
- BUG-02 : filtrage Q18 par scope + discharge_type
- BUG-09 : clarifier sous-scopes WWTP vs raccordement égout

**P2 — Corrections importantes (avant déploiement production)**
- BUG-03 : scinder "Discharge" en direct vs indirect
- BUG-04 : ajouter sous-scope FSE/commercial kitchen
- BUG-05 : étendre Q15 aux rejets indirects

**P3 — Améliorations UX (post-déploiement)**
- BUG-06 : ajouter équivalences PE dans capacité
- BUG-07 : rendre Q16 conditionnelle pour rejet indirect
- BUG-08 : exclusion mutuelle Q19
- BUG-10 : clarifier libellé Q12

