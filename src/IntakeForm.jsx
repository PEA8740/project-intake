/**
 * AquaForge regAssist — Intake Questionnaire Component
 * File: IntakeForm.jsx
 * Version: 2.1.0
 *
 * Changelog v2.0 → v2.1:
 *   BUG-01: getFilteredOptions() — Q17 water_streams filtered by scope + discharge
 *   BUG-02: getFilteredOptions() — Q18 project_activities filtered by source + discharge
 *   BUG-03: direct_environmental_discharge and sewer_connection_discharge rendered distinctly
 *   BUG-05: Q15 required_if now includes indirect discharge (handled in canonical — no code change)
 *   BUG-07: Q16 conditional (handled in canonical — no code change)
 *   BUG-08: Mutual exclusion enforced for Q19 no_groundwater_impact
 *   All other bugs (BUG-04, BUG-06, BUG-09, BUG-10): handled in canonical + locale files
 */

import { useState, useEffect, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
const DEFAULT_LANG = "en";

// ── Condition engine ──────────────────────────────────────────────────────────
/**
 * Evaluates whether a question should be visible based on current answers.
 * Supports: any_selected, equals, all_selected, none_selected.
 */
function isQuestionVisible(question, answers) {
  const cond = question.required_if;
  if (!cond) return true;

  if (cond.any_selected) {
    const { question: qId, values } = cond.any_selected;
    const selected = answers[qId] || [];
    return values.some((v) =>
      (Array.isArray(selected) ? selected : [selected]).includes(v)
    );
  }

  if (cond.equals) {
    return answers[cond.equals.question] === cond.equals.value;
  }

  if (cond.all_selected) {
    const { question: qId, values } = cond.all_selected;
    const selected = answers[qId] || [];
    return values.every((v) => selected.includes(v));
  }

  if (cond.none_selected) {
    const { question: qId, values } = cond.none_selected;
    const selected = answers[qId] || [];
    return !values.some((v) => selected.includes(v));
  }

  return true;
}

// ── BUG-01 + BUG-02: Dynamic option filtering ─────────────────────────────────
/**
 * Returns the filtered subset of options for a given question,
 * based on current answers (water_families, discharge_type, water_source_type).
 * Only Q17 (water_streams) and Q18 (project_activities) are filtered.
 * All other questions return their full option list unchanged.
 */
function getFilteredOptions(question, answers) {
  const { id: qId, options } = question;

  if (qId !== "water_streams" && qId !== "project_activities") {
    return options;
  }

  const families  = answers["water_families"]    || [];
  const discharge = answers["discharge_type"]    || [];
  const source    = answers["water_source_type"] || [];

  // Scope helpers
  const hasDW     = families.includes("drinking_water");
  const hasMWW    = families.includes("municipal_wastewater");
  const hasIWW    = families.includes("industrial_wastewater");
  const hasReuse  = families.includes("water_reuse");
  const hasSW     = families.includes("stormwater");
  const hasResid  = families.includes("residuals_biosolids");
  const hasGW     = families.includes("groundwater");

  // Discharge helpers
  const hasDirect     = discharge.some((d) =>
    ["direct_surface_water", "direct_groundwater"].includes(d)
  );
  const hasIndirect   = discharge.some((d) =>
    ["indirect_sanitary_sewer", "indirect_storm_sewer"].includes(d)
  );
  const hasLand       = discharge.includes("land_application");
  const hasReuseDis   = discharge.includes("reuse_on_site");

  // Source helpers
  const RAW_WATER_SOURCES = [
    "river_stream", "lake_reservoir", "large_lake_system",
    "ocean_coastal", "confined_aquifer", "unconfined_aquifer",
    "rainwater_harvesting",
  ];
  const hasRawWaterSource = source.some((s) => RAW_WATER_SOURCES.includes(s));
  const onMunicipalSupplyOnly =
    source.includes("municipal_supply") && !hasRawWaterSource;

  // ── BUG-01: Q17 water_streams filtering ────────────────────────────────────
  if (qId === "water_streams") {
    return options.filter(({ id: optId }) => {
      switch (optId) {
        case "raw_water":
          return hasDW || (hasIWW && !onMunicipalSupplyOnly);

        case "raw_wastewater":
          return hasMWW || hasIWW;

        case "industrial_process_water":
          return hasIWW;

        case "filter_backwash_water":
          return hasDW || hasMWW;

        case "membrane_concentrate_ro_reject":
          return hasDW || hasReuse || hasIWW;

        case "recycled_process_water":
          return hasDW || hasMWW || hasIWW;

        case "disinfection_byproduct_streams":
          return hasDW || hasMWW;

        case "cooling_water":
          return hasIWW;

        case "treated_drinking_water":
          return hasDW;

        case "treated_wastewater_effluent":
          return (hasMWW || hasIWW) &&
                 (hasDirect || hasReuse || hasLand || hasReuseDis);

        case "sludge_biosolids":
          return hasMWW || hasDW || hasIWW || hasResid;

        case "spent_filter_media_resin":
          return hasDW || hasMWW || hasIWW;

        case "stormwater_site_runoff":
          return hasSW || hasIWW || hasMWW;

        case "leachate":
          return hasResid || hasIWW || (hasMWW && hasGW);

        default:
          return true;
      }
    });
  }

  // ── BUG-02: Q18 project_activities filtering ───────────────────────────────
  if (qId === "project_activities") {
    // Determine if the facility operates a sewer/distribution network
    const mwwSubscopes = answers["municipal_wastewater_subscopes"] || [];
    const dwSubscopes  = answers["drinking_water_subscopes"]       || [];
    const isNetworkOperator =
      mwwSubscopes.includes("centralized_wwtp_operator") ||
      dwSubscopes.includes("drinking_water_distribution");

    return options.filter(({ id: optId }) => {
      switch (optId) {
        // BUG-02: hide abstraction if facility is on municipal supply only
        case "water_abstraction_withdrawal":
          return !onMunicipalSupplyOnly;

        case "pretreatment":
          return true; // always shown

        case "treatment":
          return true; // always shown

        case "advanced_treatment":
          return hasDW || hasMWW || hasReuse || hasIWW;

        case "storage":
          return true; // always shown

        // BUG-02: collection/conveyance only for network operators
        case "collection_conveyance":
          return isNetworkOperator;

        // BUG-03: direct environmental discharge only for direct discharge projects
        case "direct_environmental_discharge":
          return hasDirect || hasLand;

        // BUG-03: sewer connection discharge only for indirect discharge projects
        case "sewer_connection_discharge":
          return hasIndirect;

        case "reuse":
          return hasReuse || hasReuseDis;

        case "residuals_management":
          return hasMWW || hasDW || hasIWW || hasResid;

        case "monitoring_reporting":
          return true; // always shown

        default:
          return true;
      }
    });
  }

  return options;
}

// ── BUG-08: Mutual exclusion handler for Q19 groundwater_impact ───────────────
const GROUNDWATER_EXCLUSIVE_OPTION = "no_groundwater_impact";

function applyGroundwaterExclusion(questionId, optionId, currentValue) {
  if (questionId !== "groundwater_impact") return null; // not applicable

  const current = Array.isArray(currentValue) ? currentValue : [];

  if (optionId === GROUNDWATER_EXCLUSIVE_OPTION) {
    // Selecting "no impact" → deselect all others
    return current.includes(optionId) ? [] : [GROUNDWATER_EXCLUSIVE_OPTION];
  } else {
    // Selecting any "Yes" option → remove "no impact" if present
    const withoutExclusive = current.filter(
      (v) => v !== GROUNDWATER_EXCLUSIVE_OPTION
    );
    return withoutExclusive.includes(optionId)
      ? withoutExclusive.filter((v) => v !== optionId)
      : [...withoutExclusive, optionId];
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateQuestion(question, answers) {
  if (question.required === false) return null;
  if (question.type === "text_area") return null;

  const value = answers[question.id];

  if (question.type === "multi_select") {
    if (!value || value.length === 0) {
      return "Please select at least one option to continue.";
    }
  } else if (question.type === "radio") {
    if (!value) {
      return "Please select one option to continue.";
    }
  }
  return null;
}

// ── Input components ──────────────────────────────────────────────────────────
function MultiSelect({ question, value = [], onChange, answers }) {
  const filtered = getFilteredOptions(question, answers);

  const toggle = (optId) => {
    // BUG-08: apply mutual exclusion for groundwater_impact
    const exclusive = applyGroundwaterExclusion(question.id, optId, value);
    if (exclusive !== null) {
      onChange(question.id, exclusive);
    } else {
      const next = value.includes(optId)
        ? value.filter((v) => v !== optId)
        : [...value, optId];
      onChange(question.id, next);
    }
  };

  return (
    <div className="options-list">
      {filtered.map((opt) => (
        <label
          key={opt.id}
          className={`option-item ${value.includes(opt.id) ? "selected" : ""}`}
        >
          <input
            type="checkbox"
            checked={value.includes(opt.id)}
            onChange={() => toggle(opt.id)}
          />
          <span>{opt.label || opt.id}</span>
        </label>
      ))}
    </div>
  );
}

function RadioGroup({ question, value = "", onChange }) {
  return (
    <div className="options-list">
      {question.options.map((opt) => (
        <label
          key={opt.id}
          className={`option-item ${value === opt.id ? "selected" : ""}`}
        >
          <input
            type="radio"
            name={question.id}
            value={opt.id}
            checked={value === opt.id}
            onChange={() => onChange(question.id, opt.id)}
          />
          <span>{opt.label || opt.id}</span>
        </label>
      ))}
    </div>
  );
}

function TextArea({ question, value = "", onChange }) {
  return (
    <textarea
      className="text-area-input"
      rows={5}
      placeholder={question.placeholder || ""}
      value={value}
      onChange={(e) => onChange(question.id, e.target.value)}
    />
  );
}

function TextInput({ question, value = "", onChange }) {
  return (
    <input
      className="text-input"
      type="text"
      placeholder={question.placeholder || ""}
      value={value}
      onChange={(e) => onChange(question.id, e.target.value)}
    />
  );
}

// Dispatcher — renders correct component per question type
const RENDERERS = {
  multi_select: (props) => <MultiSelect {...props} />,
  radio:        (props) => <RadioGroup  {...props} />,
  text_area:    (props) => <TextArea    {...props} />,
  text:         (props) => <TextInput   {...props} />,
};

function QuestionRenderer({ question, answers, onChange }) {
  const value   = answers[question.id];
  const Renderer = RENDERERS[question.type];

  if (!Renderer) {
    return (
      <p style={{ color: "red" }}>
        Unknown question type: {question.type}
      </p>
    );
  }

  return (
    <Renderer
      question={question}
      value={value}
      onChange={onChange}
      answers={answers}
    />
  );
}

// ── Previous answers sidebar ──────────────────────────────────────────────────
function getDisplayValue(question, answers) {
  const value = answers[question.id];
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  if (question.type === "text_area") {
    return value.length > 100 ? value.substring(0, 100) + "…" : value;
  }
  if (Array.isArray(value)) {
    return value
      .map((id) => question.options?.find((o) => o.id === id)?.label || id)
      .join(", ");
  }
  return question.options?.find((o) => o.id === value)?.label || value;
}

function PreviousAnswers({ questions, answers }) {
  const answered = questions.filter((q) => getDisplayValue(q, answers));

  if (answered.length === 0) {
    return <p className="no-answers">No previous answers yet.</p>;
  }

  return (
    <div className="previous-answers">
      {answered.map((q) => (
        <div key={q.id} className="previous-answer-item">
          <span className="prev-question">{q.label}</span>
          <span className="prev-value">{getDisplayValue(q, answers)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Completion screen ─────────────────────────────────────────────────────────
function CompletionScreen({ result, onRestart }) {
  return (
    <div className="intake-complete">
      <h2>✓ Intake complete</h2>
      <p>
        Your project has been submitted. The regAssist engine is mapping
        applicable regulations based on your jurisdiction and project
        classification.
      </p>
      {result?.classification && (
        <details>
          <summary>View classification object</summary>
          <pre className="classification-json">
            {JSON.stringify(result.classification, null, 2)}
          </pre>
        </details>
      )}
      <button className="btn-restart" onClick={onRestart}>
        ← Start over
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IntakeForm({ lang = DEFAULT_LANG, onComplete }) {
  const [schema,       setSchema]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [answers,      setAnswers]      = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [validationError, setValidationError] = useState(null);
  const [submitted,    setSubmitted]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [result,       setResult]       = useState(null);

  // Fetch schema from backend
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/intake/schema?lang=${lang}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then((data) => {
        setSchema(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [lang]);

  // Compute visible questions based on current answers
  const visibleQuestions = useCallback(() => {
    if (!schema) return [];
    return schema.questions.filter((q) => isQuestionVisible(q, answers));
  }, [schema, answers]);

  const visible         = visibleQuestions();
  const total           = visible.length;
  const currentQuestion = visible[currentIndex] || null;

  // Answer handler with reset of downstream answers on scope change
  const handleChange = useCallback((qId, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: value };

      // If water_families changed, clear conditional sub-scope answers
      if (qId === "water_families") {
        const subScopes = [
          "drinking_water_subscopes", "municipal_wastewater_subscopes",
          "industrial_wastewater_subscopes", "stormwater_subscopes",
          "groundwater_subscopes", "water_reuse_subscopes", "residuals_subscopes",
        ];
        subScopes.forEach((s) => delete next[s]);
      }

      return next;
    });
    setValidationError(null);
  }, []);

  // Navigation with validation
  const navigate = useCallback(
    (direction) => {
      if (direction === 1) {
        const err = validateQuestion(currentQuestion, answers);
        if (err) {
          setValidationError(err);
          return;
        }
        if (currentIndex >= total - 1) {
          handleSubmit();
          return;
        }
      }
      setCurrentIndex((i) => Math.max(0, Math.min(total - 1, i + direction)));
      setValidationError(null);
    },
    [currentIndex, total, currentQuestion, answers]
  );

  // Submit handler
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/intake/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ answers, lang }),
      });
      if (!res.ok) throw new Error(`Submit error ${res.status}`);
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      if (onComplete) onComplete(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
    setResult(null);
    setError(null);
    setValidationError(null);
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return <div className="intake-loading">Loading questionnaire…</div>;
  }

  if (error) {
    return (
      <div className="intake-error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!schema || !currentQuestion) {
    return <div className="intake-loading">No questions available.</div>;
  }

  if (submitted) {
    return <CompletionScreen result={result} onRestart={restart} />;
  }

  const isLastQuestion  = currentIndex === total - 1;
  const progressPercent = Math.round((currentIndex / total) * 100);
  const ui              = schema.ui || {};

  return (
    <div className="intake-form">

      {/* Progress bar */}
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header */}
      <div className="intake-header">
        <span className="progress-label">
          {(ui.progress_label || "Question {current} of {total}")
            .replace("{current}", currentIndex + 1)
            .replace("{total}", total)}
        </span>
        <span className="step-label">
          {currentQuestion.step || ""}
        </span>
        <span className="intake-status">
          {ui.intake_complete_label || "Intake complete"}
        </span>
      </div>

      {/* Body */}
      <div className="intake-body">

        {/* Left — current question */}
        <div className="question-panel">
          <h3 className="question-label">
            {currentQuestion.label}
            {currentQuestion.required !== false &&
             currentQuestion.type !== "text_area" && (
              <span className="required-mark" aria-label="required"> *</span>
            )}
          </h3>

          {currentQuestion.help && (
            <p className="question-help">{currentQuestion.help}</p>
          )}

          <QuestionRenderer
            question={currentQuestion}
            answers={answers}
            onChange={handleChange}
          />

          {/* Validation error */}
          {validationError && (
            <div className="validation-error" role="alert">
              ⚠ {validationError}
            </div>
          )}
        </div>

        {/* Right — previous answers */}
        <div className="answers-panel">
          <h4 className="answers-panel-title">Previous Answers</h4>
          <PreviousAnswers
            questions={visible.slice(0, currentIndex)}
            answers={answers}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="intake-nav">
        <button
          className="btn btn-previous"
          onClick={() => navigate(-1)}
          disabled={currentIndex === 0}
        >
          {ui.previous_button || "← Previous"}
        </button>

        <button
          className="btn btn-next"
          onClick={() => navigate(1)}
          disabled={submitting}
        >
          {submitting
            ? "Submitting…"
            : isLastQuestion
              ? (ui.submit_button || "Submit ✓")
              : (ui.next_button || "Next →")}
        </button>
      </div>
    </div>
  );
}
