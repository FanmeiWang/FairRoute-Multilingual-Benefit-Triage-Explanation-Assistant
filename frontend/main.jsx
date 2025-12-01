import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

const API_BASE = "http://127.0.0.1:8000/api";

// 只是 placeholder，文本框默认是空的
const SAMPLE_TEXT =
  "For example: I was laid off from my job in Ontario and I have two children. I want to know what benefits I might be eligible for.";

// ---------- 小工具：格式化 ----------

function formatLabel(key) {
  if (!key) return "";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCitizenStatus(status) {
  if (!status) return "Status not available";

  switch (status) {
    case "eligible":
      return "Likely eligible";
    case "not_eligible":
      return "Likely not eligible";
    case "need_more_info":
      return "We need a bit more information";
    default:
      return status;
  }
}

// 省份 / 其他枚举选项
const PROVINCE_OPTIONS = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "employed", label: "Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "self_employed", label: "Self-employed" },
  { value: "gig", label: "Gig / casual work" },
  { value: "retired", label: "Retired" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other / not listed" },
];

const UNEMPLOYMENT_REASON_OPTIONS = [
  { value: "layoff", label: "Laid off / shortage of work" },
  { value: "end_of_contract", label: "End of contract" },
  { value: "quit", label: "Quit the job" },
  { value: "fired_for_cause", label: "Dismissed for cause" },
  { value: "health", label: "Health-related" },
  { value: "family_care", label: "Caring for a family member" },
  { value: "school", label: "Going to school / training" },
  { value: "other", label: "Other / not sure" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "zh", label: "Chinese" },
  { value: "other", label: "Other" },
];

const RESIDENCY_STATUS_OPTIONS = [
  { value: "canadian_resident", label: "Resident of Canada for tax purposes" },
  { value: "permanent_resident", label: "Permanent resident" },
  {
    value: "temporary_resident",
    label: "Temporary resident / worker / student",
  },
  { value: "refugee_claimant", label: "Refugee claimant" },
  { value: "other", label: "Other / not sure" },
];

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

// 用于 Clarify 答案展示
function formatClarifierAnswer(field, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "";
  }
  const value = rawValue;

  const lookup = (opts, v) => {
    const found = opts.find((o) => o.value === v);
    return found ? found.label : String(v);
  };

  switch (field) {
    case "province":
      return lookup(PROVINCE_OPTIONS, value);
    case "employment_status":
      return lookup(EMPLOYMENT_STATUS_OPTIONS, value);
    case "unemployment_reason":
      return lookup(UNEMPLOYMENT_REASON_OPTIONS, value);
    case "preferred_language":
      return lookup(LANGUAGE_OPTIONS, value);
    case "residency_status":
      return lookup(RESIDENCY_STATUS_OPTIONS, value);
    case "is_single_parent":
    case "has_disability":
    case "needs_accommodation":
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (value === "yes") return "Yes";
      if (value === "no") return "No";
      return String(value);
    default:
      return String(value);
  }
}

// ---------- Clarify 问题定义（前端控制，不再相信后端顺序） ----------

const CLARIFIER_QUESTIONS = [
  {
    id: "province",
    field: "province",
    label: "In which province or territory do you live?",
    type: "select",
    required: true,
    options: PROVINCE_OPTIONS,
  },
  {
    id: "age",
    field: "age",
    label: "How old are you?",
    type: "number",
    required: true,
    min: 16,
    max: 80,
  },
  {
    id: "employment_status",
    field: "employment_status",
    label: "What best describes your work situation right now?",
    type: "select",
    required: true,
    options: EMPLOYMENT_STATUS_OPTIONS,
  },
  {
    id: "unemployment_reason",
    field: "unemployment_reason",
    label: "If you are not working, what is the main reason?",
    type: "select",
    required: false,
    options: UNEMPLOYMENT_REASON_OPTIONS,
  },
  {
    id: "children_count",
    field: "children_count",
    label: "How many children under 18 live with you most of the time?",
    type: "number",
    required: true,
    min: 0,
    max: 10,
  },
  {
    id: "youngest_child_age",
    field: "youngest_child_age",
    label: "How old is your youngest child?",
    type: "number",
    required: false,
    min: 0,
    max: 17,
  },
  {
    id: "is_single_parent",
    field: "is_single_parent",
    label:
      "Are you the only adult primarily caring for the children (a single parent)?",
    type: "boolean",
    required: false,
  },
  {
    id: "has_disability",
    field: "has_disability",
    label: "Do you have a disability that affects how you work or access services?",
    type: "boolean",
    required: false,
  },
  {
    id: "needs_accommodation",
    field: "needs_accommodation",
    label:
      "Do you need any specific accommodations when dealing with government (for example, sign language, plain language, mobility support)?",
    type: "boolean",
    required: false,
  },
  {
    id: "preferred_language",
    field: "preferred_language",
    label: "Which language would you prefer to use with this assistant?",
    type: "select",
    required: false,
    options: LANGUAGE_OPTIONS,
  },
  {
    id: "insurable_hours_last_52_weeks",
    field: "insurable_hours_last_52_weeks",
    label:
      "Roughly how many insurable hours did you work in the last 52 weeks? You can give a range.",
    type: "range", // 自定义类型：当作文本处理
    required: false,
  },
  {
    id: "residency_status",
    field: "residency_status",
    label: "What best describes your residency status for tax purposes?",
    type: "select",
    required: false,
    options: RESIDENCY_STATUS_OPTIONS,
  },
];

// ---------- 主组件 ----------

function App() {
  const [activeTab, setActiveTab] = useState("citizen");
  const [uiLanguage, setUiLanguage] = useState("en"); // 目前主要是 EN，保留接口给后端
  const isFR = uiLanguage === "fr";

  const [text, setText] = useState("");
  const [parseResult, setParseResult] = useState(null);
  const [evalResult, setEvalResult] = useState(null);
  const [loadingParse, setLoadingParse] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState("");

  // Clarify 流程状态
  const [clarifierIndex, setClarifierIndex] = useState(0);
  const [clarifierAnswers, setClarifierAnswers] = useState({});
  const [clarifiersStarted, setClarifiersStarted] = useState(false);
  const [clarifiersDone, setClarifiersDone] = useState(false);

  // 确认信息是否正确的状态
  const [infoConfirmed, setInfoConfirmed] = useState(false);

  // 后端返回的 follow_up_questions 只在 Staff view 展示（不再前端硬编码控件）
  const backendFollowUps = parseResult?.follow_up_questions || [];

  // Accessibility 状态
  const [fontScale, setFontScale] = useState(1.1);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // 根据 slider 更新全局字号和行距
  useEffect(() => {
    const base = 16;
    document.documentElement.style.fontSize = `${base * fontScale}px`;
    document.documentElement.style.setProperty(
      "--fr-line-height",
      String(lineHeight)
    );
  }, [fontScale, lineHeight]);

  const appClasses = [
  "fr-app-root",
  highContrast
    ? "fr-theme-high-contrast"       // 优先高对比
    : darkMode
    ? "fr-theme-dark"               // 其次深色
    : "",
]
  .filter(Boolean)
  .join(" ");


  const handleLanguageChange = (lang) => {
    setUiLanguage(lang);
  };

  // ---------- Step 1: /api/intake/parse ----------

  const handleParse = async () => {
    if (!text.trim()) {
      alert("Please describe your situation briefly before running Step 1.");
      return;
    }

    setLoadingParse(true);
    setError("");
    setEvalResult(null);
    setClarifierIndex(0);
    setClarifiersStarted(false);
    setClarifiersDone(false);
    setInfoConfirmed(false);

    try {
      const res = await fetch(`${API_BASE}/intake/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: uiLanguage }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setParseResult(data || null);

      // ⭐ 新逻辑：每次 Step 1 之后，Clarifier 答案全部重置为空
      const emptyAnswers = {};
      CLARIFIER_QUESTIONS.forEach((q) => {
        emptyAnswers[q.field] = "";
      });
      setClarifierAnswers(emptyAnswers);

      setClarifierIndex(0);
      setClarifiersStarted(true);
      setClarifiersDone(false);
      setInfoConfirmed(false);
    } catch (err) {
      console.error(err);
      setError(
        "Step 1 could not reach the backend. Please confirm http://127.0.0.1:8000 is running."
      );
      setParseResult(null);
      setClarifierAnswers({});
      setClarifiersStarted(false);
      setClarifiersDone(false);
      setInfoConfirmed(false);
    } finally {
      setLoadingParse(false);
    }
  };

  // ---------- Step 2: /api/intake/evaluate ----------

  const handleEvaluate = async () => {
    // 1. 没有 Step 1 的结果，就不让点 Step 2
    if (!parseResult || !parseResult.case_profile) {
      alert("Please run Step 1 first so we can understand your situation.");
      return;
    }

    setLoadingEval(true);
    setError("");
    setInfoConfirmed(false); // 每次重新评估，都需要重新确认信息

    // 2. 从 Step 1 的结果里拿出 case_profile
    const profileForEval = { ...parseResult.case_profile };

    try {
      const res = await fetch(`${API_BASE}/intake/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ⭐ 关键：只发 { case_profile: ... } 这一层
        body: JSON.stringify({
          case_profile: profileForEval,
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text();
        console.error("evaluate 失败，返回：", bodyText);
        throw new Error(`Status ${res.status}: ${bodyText}`);
      }

      const data = await res.json();
      console.log("API /api/intake/evaluate response:", data);
      setEvalResult(data || null);
    } catch (err) {
      console.error("Error calling /api/intake/evaluate:", err);
      setError("调用 /api/intake/evaluate 失败（看 Console 有详细错误）");
      setEvalResult(null);
    } finally {
      setLoadingEval(false);
    }
  };

  // ---------- Clarify：更新答案 + 写回 case_profile ----------

  const handleClarifierChange = (field, value) => {
    setClarifierAnswers((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyClarifiersToProfile = () => {
    setParseResult((prev) => {
      if (!prev) return prev;
      const prevProfile = prev.case_profile || {};
      const updatedProfile = { ...prevProfile };

      CLARIFIER_QUESTIONS.forEach((q) => {
        const raw = clarifierAnswers[q.field];
        if (raw === undefined || raw === null || raw === "") return;

        if (q.type === "number") {
          const n = Number(raw);
          if (!Number.isNaN(n)) {
            updatedProfile[q.field] = n;
          }
        } else if (q.type === "boolean") {
          if (raw === "yes") updatedProfile[q.field] = true;
          else if (raw === "no") updatedProfile[q.field] = false;
        } else {
          // select / text / range 等，按字符串写回
          updatedProfile[q.field] = raw;
        }
      });

      return {
        ...prev,
        case_profile: updatedProfile,
      };
    });
  };

  const handleClarifierNext = () => {
    const isLast = clarifierIndex >= CLARIFIER_QUESTIONS.length - 1;
    if (isLast) {
      applyClarifiersToProfile();
      setClarifiersDone(true);
      setClarifiersStarted(false);
    } else {
      setClarifierIndex((idx) => idx + 1);
    }
  };

  // ---------- Accessibility 预设 ----------

  const handleEasyReadingPreset = () => {
    setDarkMode(false);
    setHighContrast(false);
    setFontScale(1.25);
    setLineHeight(1.6);
  };

  const handleResetPreset = () => {
    setDarkMode(false);
    setHighContrast(false);
    setFontScale(1.1);
    setLineHeight(1.5);
  };

  // ---------- Citizen view ----------

  const renderCitizenView = () => {
    const caseProfile = parseResult?.case_profile || null;
    const recommendations = evalResult?.recommendations || [];

    const step2Active = !!evalResult;
    const step1ButtonClass = step2Active
      ? "fr-secondary-button"
      : "fr-primary-button";
    const step2ButtonClass = step2Active
      ? "fr-primary-button"
      : "fr-secondary-button";

    const activeClarifier =
      clarifiersStarted && !clarifiersDone
        ? CLARIFIER_QUESTIONS[clarifierIndex]
        : null;
    const totalClarifiers = CLARIFIER_QUESTIONS.length;
    const currentClarifierValue =
      activeClarifier && clarifierAnswers[activeClarifier.field] !== undefined
        ? clarifierAnswers[activeClarifier.field]
        : "";

    const clarifyNextDisabled =
      !activeClarifier ||
      (activeClarifier.required &&
        (currentClarifierValue === null ||
          currentClarifierValue === undefined ||
          String(currentClarifierValue).trim() === ""));

    const canRunStep2 =
      !!parseResult && (!clarifiersStarted || clarifiersDone);

    const renderClarifierInput = () => {
      if (!activeClarifier) return null;
      const value = currentClarifierValue ?? "";

      if (activeClarifier.type === "select") {
        return (
          <div className="fr-followup-input-row">
            <label
              className="fr-label"
              htmlFor={`clarifier-${activeClarifier.id}`}
            >
              Your answer:
            </label>
            <select
              id={`clarifier-${activeClarifier.id}`}
              className="fr-select"
              value={value}
              onChange={(e) =>
                handleClarifierChange(activeClarifier.field, e.target.value)
              }
            >
              <option value="">Please select</option>
              {activeClarifier.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (activeClarifier.type === "number") {
        return (
          <div className="fr-followup-input-row">
            <label
              className="fr-label"
              htmlFor={`clarifier-${activeClarifier.id}`}
            >
              Your answer:
            </label>
            <input
              id={`clarifier-${activeClarifier.id}`}
              type="number"
              className="fr-text-input"
              value={value}
              min={activeClarifier.min}
              max={activeClarifier.max}
              onChange={(e) =>
                handleClarifierChange(activeClarifier.field, e.target.value)
              }
            />
          </div>
        );
      }

      if (activeClarifier.type === "range") {
        return (
          <div className="fr-followup-input-row">
            <label
              className="fr-label"
              htmlFor={`clarifier-${activeClarifier.id}`}
            >
              Your answer:
            </label>
            <input
              id={`clarifier-${activeClarifier.id}`}
              type="text"
              className="fr-text-input"
              placeholder="For example: 300–600 hours"
              value={value}
              onChange={(e) =>
                handleClarifierChange(activeClarifier.field, e.target.value)
              }
            />
          </div>
        );
      }

      if (activeClarifier.type === "boolean") {
        return (
          <div className="fr-followup-input-row">
            <p className="fr-field-help">Please select Yes or No.</p>
            <fieldset className="fr-fieldset">
              <legend className="fr-label">Your answer:</legend>
              {YES_NO_OPTIONS.map((opt) => (
                <label key={opt.value} className="fr-radio-row">
                  <input
                    type="radio"
                    name={`clarifier-${activeClarifier.id}`}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={() =>
                      handleClarifierChange(activeClarifier.field, opt.value)
                    }
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </fieldset>
          </div>
        );
      }

      // 默认：简单文本输入
      return (
        <div className="fr-followup-input-row">
          <label
            className="fr-label"
            htmlFor={`clarifier-${activeClarifier.id}`}
          >
            Your answer:
          </label>
          <input
            id={`clarifier-${activeClarifier.id}`}
            type="text"
            className="fr-text-input"
            value={value}
            onChange={(e) =>
              handleClarifierChange(activeClarifier.field, e.target.value)
            }
          />
        </div>
      );
    };

    return (
      <div className="fr-view">
        {/* 场景说明 */}
        <section className="fr-section">
          <div className="fr-info-banner">
  <span className="fr-info-badge">
    {isFR ? "Note MVP" : "MVP note"}
  </span>
  <p>
    {isFR
      ? "Ce MVP se concentre sur un seul scénario : un parent récemment sans emploi au Canada. Il utilise l'assurance-emploi (AE) et l'Allocation canadienne pour enfants (ACE) comme exemples de programmes, mais le même moteur de triage peut être étendu à d'autres prestations et à d'autres événements de la vie."
      : "This MVP focuses on one scenario: a newly unemployed parent in Canada. It uses Employment Insurance (EI) and the Canada Child Benefit (CCB) as example programs, but the same triage engine can be extended to other benefits and life events."}
  </p>
</div>

        </section>

        {/* Step 1：叙述 + Step 1/2 按钮 */}
        <section className="fr-section">
          <div className="fr-field-group">
            <label className="fr-label" htmlFor="citizen-text">
  {isFR
    ? "En quelques phrases, expliquez ce qui a changé dans votre situation de travail et familiale."
    : "In a few sentences, tell us what has changed in your work and family situation."}
</label>
<p className="fr-field-help">
  {isFR
    ? "Par exemple, vous pouvez mentionner où vous vivez, comment vous avez perdu votre emploi et qui dépend de votre revenu."
    : "For example, you might mention where you live, how you lost your job, and who depends on your income."}
</p>

          </div>
          <textarea
            id="citizen-text"
            className="fr-textarea"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
    isFR
      ? "Par exemple : j'ai perdu mon emploi en Ontario et j'ai deux enfants. Je voudrais savoir à quelles prestations je pourrais avoir droit."
      : SAMPLE_TEXT
  }
          />

          <div className="fr-steps-row">
            <button
  type="button"
  className={step1ButtonClass}
  onClick={handleParse}
  disabled={loadingParse || text.trim().length === 0}
>
  {loadingParse
    ? (isFR
        ? "Analyse de votre situation..."
        : "Reading your situation...")
    : (isFR
        ? "Étape 1 : Comprendre ma situation"
        : "Step 1: Understand my situation")}
</button>

<button
  type="button"
  className={step2ButtonClass}
  onClick={handleEvaluate}
  disabled={loadingEval || !canRunStep2}
>
  {loadingEval
    ? (isFR
        ? "Vérification de vos options de prestations..."
        : "Checking your benefit options...")
    : (isFR
        ? "Étape 2 : Vérifier mes options de prestations"
        : "Step 2: Check my benefit options")}
</button>

          </div>

          {parseResult && (
            <p className="fr-note" style={{ marginTop: "8px" }}>
              After Step 1 we create a short case profile. Then we ask a few
              clarifying questions so that key fields like age, province and
              work situation are accurate before running Step 2.
            </p>
          )}
        </section>

        {/* Clarify 问题交互 */}
        {parseResult && (
          <section className="fr-section">
            <h2 className="fr-section-title">
              Quick check: clarifying questions
            </h2>

            {activeClarifier ? (
              <>
                <div className="fr-followup-meta">
                  Question {clarifierIndex + 1} of {totalClarifiers}
                </div>
                <div className="fr-followup-question">
                  <strong>{activeClarifier.label}</strong>
                </div>

                {renderClarifierInput()}

                <button
                  type="button"
                  className="fr-inline-button"
                  onClick={handleClarifierNext}
                  disabled={clarifyNextDisabled}
                >
                  {clarifierIndex === totalClarifiers - 1
                    ? "Save answers"
                    : "Next question"}
                </button>

                <p className="fr-note fr-note--small">
                  Once you’ve answered these questions, you can run Step 2 to
                  see suggested programs.
                </p>
              </>
            ) : (
              <p className="fr-note">
                {clarifiersDone
                  ? "You’ve answered all the clarifying questions. You can now run Step 2."
                  : "Run Step 1 to see clarifying questions."}
              </p>
            )}
          </section>
        )}

        {/* Step 2 之后：把 Clarify 问题 + 回答展示给 Citizen 看 */}
        {evalResult && parseResult && (
          <>
            <section className="fr-section">
              <h2 className="fr-section-title">
                Clarifying questions and your answers
              </h2>
              <ul className="fr-summary-list">
                {CLARIFIER_QUESTIONS.map((q) => {
                  const v = parseResult.case_profile?.[q.field];
                  if (v === null || v === undefined || v === "") return null;
                  return (
                    <li key={q.id}>
                      <div className="fr-followup-question">
                        <strong>{q.label}</strong>
                      </div>
                      <p className="fr-note fr-followup-answer-readonly">
                        <strong>Your answer:</strong>{" "}
                        {formatClarifierAnswer(q.field, v)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* 新增：确认信息是否正确 */}
            {!infoConfirmed && (
              <section className="fr-section">
                <div className="fr-confirm-panel">
                  <h2 className="fr-section-title">
                    Please check your information is correct
                  </h2>
                  <p className="fr-note">
                    Before we show suggested programs, please make sure the
                    details above look right. If something is missing or wrong,
                    you can go back and adjust your answers in Step 1 and the
                    clarifying questions.
                  </p>
                  <button
                    type="button"
                    className="fr-confirm-button"
                    onClick={() => setInfoConfirmed(true)}
                  >
                    Yes, this information is correct
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* Programs 列表：只有在确认信息正确之后展示 */}
        {evalResult && infoConfirmed && (
          <section className="fr-section">
            <h2 className="fr-section-title">
              Programs you might be eligible for
            </h2>
            {evalResult.recommendations.map((rec) => (
              <article key={rec.service_id} className="fr-program-card">
                <h3>{rec.service_name}</h3>
                <p>
                  <strong>Status:</strong>{" "}
                  {formatCitizenStatus(rec.eligibility_status)}
                </p>

                {/* 如果 explanation_client 有内容就展示；否则给一个默认的指导句子 */}
                {rec.explanation_client ? (
                  <p>{rec.explanation_client}</p>
                ) : (
                  <p className="fr-program-note">
                    This short summary will explain why this program may be a
                    fit for you, and what information or documents are usually
                    needed.
                  </p>
                )}

                {rec.eligibility_status === "need_more_info" && (
                  <p className="fr-status-extra">
                    We still need a bit more information to confirm if you
                    qualify. A staff member may follow up with you, and it can
                    help to prepare documents like your Record of Employment,
                    recent pay stubs and ID.
                  </p>
                )}

                {rec.required_documents &&
                  rec.required_documents.length > 0 && (
                    <>
                      <h4>Suggested documents to prepare</h4>
                      <ul className="fr-summary-list">
                        {rec.required_documents.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </>
                  )}
              </article>
            ))}
          </section>
        )}
      </div>
    );
  };

  // ---------- Staff view ----------

  const renderStaffView = () => {
  const caseProfile = parseResult?.case_profile || null;
  const recommendations = evalResult?.recommendations || [];
  const ticketPriority = evalResult?.ticket_priority || null;

  // 根据 caseProfile 过滤掉已经回答过的 follow-up question
  const rawFollowUps = backendFollowUps || [];

  const filteredFollowUps =
    caseProfile == null
      ? rawFollowUps
      : rawFollowUps.filter((q) => {
          const lower = q.toLowerCase();

          // 针对 insurable hours：如果 profile 里已经有值，就不显示这条
          if (lower.includes("insurable hours")) {
            const hrs = caseProfile.insurable_hours_last_52_weeks;
            if (hrs !== null && hrs !== undefined && hrs !== "") {
              return false;
            }
          }
          return true;
        });

    return (
      <div className="fr-view">
        {/* Case profile 表格 */}
        <section className="fr-section">
          <h2 className="fr-section-title">Case profile (structured)</h2>
          {caseProfile ? (
            <table className="fr-table">
              <tbody>
                {Object.entries(caseProfile).map(([key, value]) => (
                  <tr key={key}>
                    <th>{formatLabel(key)}</th>
                    <td>
                      {value === null || value === undefined || value === ""
                        ? "Not provided"
                        : String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>
              No case profile yet. Run Step 1 in the Citizen view to populate
              this section.
            </p>
          )}
        </section>

        {/* Clarify 问题 + Citizen 的回答 */}
        <section className="fr-section">
          <h2 className="fr-section-title">
            Clarifying questions and citizen answers (demo)
          </h2>
          {caseProfile ? (
            <ul className="fr-summary-list">
              {CLARIFIER_QUESTIONS.map((q) => {
                const v = caseProfile[q.field];
                if (v === null || v === undefined || v === "") return null;
                return (
                  <li key={q.id}>
                    <div className="fr-followup-question">
                      <strong>{q.label}</strong>
                    </div>
                    <p className="fr-note">
                      <strong>Citizen answer:</strong>{" "}
                      {formatClarifierAnswer(q.field, v)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No clarifying answers yet. Run Step 1 in the Citizen view.</p>
          )}
        </section>

        {/* 后端建议的额外 follow‑up 问题（只读） */}
        <section className="fr-section">
  <h2 className="fr-section-title">
    Backend suggested extra questions
  </h2>
  {filteredFollowUps && filteredFollowUps.length > 0 ? (
    <ul className="fr-summary-list">
      {filteredFollowUps.map((q, i) => (
        <li key={i}>{q}</li>
      ))}
    </ul>
  ) : (
    <p>No extra follow-up questions returned by the backend.</p>
  )}
</section>


        {/* Priority & routing guidance */}
        <section className="fr-section">
          <h2 className="fr-section-title">
            Priority and routing guidance (internal)
          </h2>
          {ticketPriority ? (
            <div className="fr-priority-container">
              <p className="fr-priority-summary">
                <strong>Score:</strong>{" "}
                {ticketPriority.score?.toFixed?.(2) ??
                  ticketPriority.score ??
                  "N/A"}
              </p>
              <p className="fr-priority-summary">
                <strong>Priority band:</strong> {ticketPriority.band ?? "N/A"}
              </p>
              <p className="fr-priority-summary">
                <strong>Flag for human review:</strong>{" "}
                {ticketPriority.requires_human_review ? "Yes" : "No"}
              </p>
              {ticketPriority.reasons &&
                ticketPriority.reasons.length > 0 && (
                  <>
                    <p className="fr-note" style={{ marginTop: "6px" }}>
                      Why this case may need faster attention
                    </p>
                    <ul className="fr-priority-reasons">
                      {ticketPriority.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </>
                )}
            </div>
          ) : (
            <p>
              No computed priority yet. Run Step 2 in the Citizen view to see
              routing guidance.
            </p>
          )}
        </section>

        {/* Program recommendations 给 staff 的版本 */}
        <section className="fr-section">
          <h2 className="fr-section-title">Program recommendations</h2>
          {recommendations.length > 0 ? (
            recommendations.map((rec) => (
              <article key={rec.service_id} style={{ marginBottom: "16px" }}>
                <h3>{rec.service_name}</h3>
                <p>
                  <strong>Status:</strong> {rec.eligibility_status}
                </p>
                {rec.explanation_staff ? (
                  <p>{rec.explanation_staff}</p>
                ) : (
                  <p>{rec.explanation_client}</p>
                )}
                {rec.rule_hits && rec.rule_hits.length > 0 && (
                  <>
                    <h4>Rules that fired</h4>
                    <ul className="fr-summary-list">
                      {rec.rule_hits.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </>
                )}
              </article>
            ))
          ) : (
            <p>
              No recommendations yet. Run Step 2 in the Citizen view to see
              matched programs here.
            </p>
          )}
        </section>

        {/* 原始 JSON：给 reviewer / judge */}
        <section className="fr-section">
          <details>
            <summary>Show raw JSON (for auditors)</summary>
            <pre className="fr-pre">
              {JSON.stringify(
                { parseResult: parseResult || {}, evalResult: evalResult || {} },
                null,
                2
              )}
            </pre>
          </details>
        </section>
      </div>
    );
  };

  // ---------- 页面整体 ----------

  return (
    <div className={appClasses}>
      <div className="fr-shell">
        {/* 左侧 Accessibility panel */}
        <aside className="fr-accessibility-panel">
          <h2>{isFR ? "Accessibilité" : "Accessibility"}</h2>

          <label className="fr-toggle-row">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
            <span>{isFR ? "Mode sombre" : "Dark mode"}</span>
          </label>

          <label className="fr-toggle-row">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
            />
            <span>{isFR ? "Contraste élevé" : "High contrast"}</span>
          </label>

          <div className="fr-slider-row">
            <label>
              <span>{isFR ? "Taille du texte ×" : "Font size ×"}</span>
              <span>{fontScale.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
            />
          </div>

          <div className="fr-slider-row">
            <label>
              <span>{isFR ? "Interligne" : "Line height"}</span>
              <span>{lineHeight.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="1.2"
              max="2"
              step="0.05"
              value={lineHeight}
              onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            />
          </div>

          <div className="fr-accessibility-presets">
            <button
              type="button"
              className="fr-pill-button"
              onClick={handleEasyReadingPreset}
            >
              {isFR ? "Lecture facile" : "Easy reading"}
            </button>
            <button
              type="button"
              className="fr-pill-button"
              onClick={handleResetPreset}
            >
              {isFR ? "Réinitialiser" : "Reset settings"}
            </button>
          </div>

          <p className="fr-help-title">
            {isFR
              ? "Ce que ces réglages facilitent"
              : "What these settings help with"}
          </p>
          <ul>
            <li>
              {isFR
                ? "Mode sombre – couleurs plus douces pour les environnements peu éclairés ou la sensibilité à la lumière."
                : "Dark mode – softer colours for low-light or light sensitivity."}
            </li>
            <li>
              {isFR
                ? "Contraste élevé – thème noir et blanc pour un contraste maximal."
                : "High contrast – black/white theme for maximum contrast."}
            </li>
            <li>
              {isFR
                ? "Taille du texte × – agrandit tout le texte si vous avez une basse vision ou utilisez un petit écran."
                : "Font size × – enlarge all text if you have low vision or view on a small screen."}
            </li>
            <li>
              {isFR
                ? "Interligne – ajoute de l'espace entre les lignes pour réduire l'encombrement visuel."
                : "Line height – add space between lines to reduce visual crowding."}
            </li>
          </ul>

          <p className="fr-help-title">
            {isFR
              ? "Comment utiliser cet assistant"
              : "How to use this assistant"}
          </p>
          <ul>
            <li>
              {isFR ? (
                <>
                  Dans <strong>la vue Citoyen</strong>, décrivez votre situation
                  et répondez aux questions de clarification.
                </>
              ) : (
                <>
                  In <strong>Citizen view</strong>, describe your situation and
                  answer the clarifying questions.
                </>
              )}
            </li>
            <li>
              {isFR ? (
                <>
                  Puis cliquez sur <strong>Étape 2</strong> pour voir les
                  prestations possibles.
                </>
              ) : (
                <>
                  Then click <strong>Step 2</strong> to see potential benefit
                  programs.
                </>
              )}
            </li>
            <li>
              {isFR ? (
                <>
                  Dans <strong>la vue Personnel</strong>, vous pouvez consulter
                  le profil de cas, les réponses aux clarifications, les
                  indications de priorité et les détails d'orientation.
                </>
              ) : (
                <>
                  In <strong>Staff view</strong>, you can inspect the case
                  profile, clarifying answers, priority guidance and routing
                  details.
                </>
              )}
            </li>
          </ul>
        </aside>

        {/* 右侧主内容 */}
        <main className="fr-main-panel">
          {/* 右上角语言切换 */}
          <div className="fr-language-switcher">
            <button
              type="button"
              className={
                uiLanguage === "en"
                  ? "fr-language-toggle fr-language-toggle--active"
                  : "fr-language-toggle"
              }
              onClick={() => handleLanguageChange("en")}
            >
              English
            </button>
            <button
              type="button"
              className={
                uiLanguage === "fr"
                  ? "fr-language-toggle fr-language-toggle--active"
                  : "fr-language-toggle"
              }
              onClick={() => handleLanguageChange("fr")}
            >
              Français
            </button>
          </div>

          <header>
            <h1 className="fr-main-title">
              {isFR
                ? "Assistant de triage des prestations FairRoute"
                : "FairRoute Benefit Triage Assistant"}
            </h1>
            <p className="fr-main-subtitle">
              {isFR
                ? "Un assistant multilingue pour aider les résidents à expliquer leur situation en langage clair, à trouver des programmes comme l'assurance-emploi (AE) et l'Allocation canadienne pour enfants (ACE), et à fournir au personnel des explications transparentes basées sur des règles ainsi que des signaux de priorité."
                : "A multilingual assistant to help residents explain their situation in plain language, find relevant programs like Employment Insurance (EI) and Canada Child Benefit (CCB), and give staff transparent, rules-based explanations and priority signals."}
            </p>
          </header>

          <div className="fr-tabs">
            <button
              type="button"
              className={
                activeTab === "citizen"
                  ? "fr-tab-button fr-tab-button--active"
                  : "fr-tab-button"
              }
              onClick={() => setActiveTab("citizen")}
            >
              {isFR ? "Vue citoyen" : "Citizen view"}
            </button>
            <button
              type="button"
              className={
                activeTab === "staff"
                  ? "fr-tab-button fr-tab-button--active"
                  : "fr-tab-button"
              }
              onClick={() => setActiveTab("staff")}
            >
              {isFR ? "Vue personnel" : "Staff view"}
            </button>
          </div>

          {error && (
            <p className="fr-note" style={{ color: "#b91c1c" }}>
              {error}
            </p>
          )}
          
          {activeTab === "citizen" ? renderCitizenView() : renderStaffView()}

<footer className="fr-footer">
  <span>
    @Fanmei Wang &amp; Alexander Fu, 2025 — FairRoute Benefit Triage Assistant
  </span>
</footer>


        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
