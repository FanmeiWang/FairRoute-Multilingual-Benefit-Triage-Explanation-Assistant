# Design Document – FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant

_Last updated: 2025‑11‑22

---

## 1. Purpose and scope

This document describes the technical design of **FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant** (“_FairRoute_” or “_the assistant_”).

FairRoute is a prototype assistant for the G7 GovAI Grand Challenge. It helps newly unemployed parents – including single parents and clients with language or accessibility needs – understand:

- Employment Insurance (EI – regular benefits),
- the Canada Child Benefit (CCB), and
- related programs that could support them.

The assistant:

1. Accepts free‑text descriptions of a person’s situation in multiple languages.
2. Uses an LLM to extract a **structured case profile**.
3. Matches the profile to relevant services using open government data.
4. Applies a transparent **rules engine** to estimate likely eligibility.
5. Computes a **priority score** for routing in queues.
6. Generates **plain‑language explanations** for citizens and **evidence summaries** for staff.

This design document is aimed at technical reviewers and developers who want to understand how FairRoute works “under the hood” and how to extend it.

---

## 2. Problem statement and personas

### 2.1 Problem statement (Problem 4 – public‑facing scenario)

Unemployed parents – especially those with language barriers, disabilities or complex situations – struggle to:

- Know which federal programs apply (EI, CCB, etc.).
- Understand eligibility rules stated in complex legal language.
- Communicate their situation to Service Canada staff.
- Get routed fairly when capacity is constrained.

Governments lack tools to:

- Parse the citizen’s own words into structured information.
- Explain recommendations transparently, with links to legislation and open data.
- Prioritise vulnerable cases (e.g., single parents, disability, high‑unemployment regions) without opaque “black box” scoring.

### 2.2 Target personas

Initial personas supported by this MVP:

1. **Newly unemployed parent**  
   - Recently laid off or contract ended.  
   - Has one or more children under 18.  
   - Unsure about EI and CCB, and which to apply for first.

2. **Single parent**  
   - Primary and only adult caregiver for children.  
   - Income shock has immediate impact on household stability.  
   - High priority for routing and clear explanations.

3. **Parent with language or accessibility needs**  
   - Limited English or French, may prefer another language (e.g., Simplified Chinese).  
   - May need plain‑language content and high‑contrast UI.

4. **Front‑line staff member**  
   - Needs a quick overview of a case, suggested programs, rules triggered, and reasons for priority.  
   - Needs to verify that automated triage is aligned with legislation and policy.

Future personas (beyond MVP) could include newcomers, older workers nearing retirement, and people with disabilities needing specific accommodations.

---

## 3. High‑level architecture

FairRoute is implemented as a small full‑stack application:

- **Frontend**: React single‑page app (SPA) built with Vite.
  - Two main views:
    - **Citizen Portal** – where the citizen describes their situation and sees recommendations.
    - **Staff Console** – where staff load a logged case and see explanations, rules fired and priority.

- **Backend**: FastAPI service written in Python.
  - Exposes JSON APIs for intake parsing, evaluation, and admin inspection of rules.
  - Integrates with OpenAI’s Chat Completions API for:
    - Structured case extraction.
    - Explanation generation.

- **Data & configuration** (local files; no external DB in the MVP):
  - CSV: service and program metadata.
  - JSON: program guides and test cases.
  - YAML: rules and priority scoring configuration.

- **Logs / “proof packages”**:
  - Each evaluated case is logged as a JSON file under `logs/`, containing:
    - The structured case profile.
    - Recommendations.
    - Rules fired and priority reasons.

### 3.1 Component diagram (conceptual)

1. **Browser (Citizen / Staff)**  
   → sends HTTP requests to  
2. **FastAPI backend**  
   → loads data and configs from `data/` and `config/`  
   → calls **OpenAI API** for LLM tasks  
   → returns structured JSON responses.

All components can run locally on a developer laptop; no cloud deployment is required for the MVP.

---

## 4. Data and configuration

All data used by the prototype is stored as flat files under `data/` and `config/`. This makes the repositories portable and simplifies inspection by judges.

### 4.1 Directory layout (data & config)

```text
fairroute/
  data/
    services_demo.csv
    programs.csv
    program_guides.json
    test_cases.json
  config/
    rules.yaml
    priority_rules.yaml
```

### 4.2 `services_demo.csv` – service metadata

Sample fields:

- `service_id` – short identifier, e.g. `EI_REGULAR`, `CCB`.
- `service_name_en` / `service_name_fr`
- `service_description_en` / `service_description_fr`
- `service_scope` – e.g. `external` (citizen‑facing benefit).
- `service_type` – e.g. `benefit`.
- `keywords` – simple keyword list.
- `organization_en` – owning department (e.g. ESDC, CRA).
- `online_availability` – `"yes"` / `"no"`.
- `website_url_en` – public information page.

In production, this could be generated from the **GC Service Inventory** open data set.

### 4.3 `programs.csv` – GC InfoBase subset

Fields:

- `program_id` – e.g. `EI_PROGRAM_001`
- `program_name_en` / `program_name_fr`
- `organization_en`
- `latest_expenditure_millions`
- `latest_year`

Used mainly for evidence and traceability (“this recommendation is backed by an X‑billion‑dollar program run by Y”).

### 4.4 `program_guides.json` – guidance and document checklists

Per service, stores:

- `eligibility_text_en` / `eligibility_text_fr` – short, human‑curated paraphrases of official guidance.
- `required_documents_en` – list of documents to prepare (e.g. SIN, Record of Employment).

These texts are paraphrased summaries of official pages, not verbatim quotes.

### 4.5 `rules.yaml` – rules / legislation mapping

Structure (simplified):

```yaml
services:
  - id: "EI_REGULAR"
    program_id: "EI_PROGRAM_001"
    rules:
      - rule_id: "EI_BASE_ELIGIBILITY"
        source_act: "Employment Insurance Act"
        section: "s.7(2)"
        condition: "employment_status == 'unemployed' and unemployment_reason in ['layoff','end_of_contract'] and insurable_hours_last_52_weeks is not None and insurable_hours_last_52_weeks >= 420"
        outcome: "likely_eligible"
        explanation_template_en: "You lost your job through no fault of your own and appear to have enough insurable hours."
        explanation_template_fr: "..."
      # ...
  - id: "CCB"
    program_id: "CCB_PROGRAM_001"
    rules:
      - rule_id: "CCB_BASE_ELIGIBILITY"
        source_act: "Income Tax Act"
        section: "s.122.6"
        condition: "children_count > 0 and youngest_child_age is not None and youngest_child_age < 18 and residency_status == 'canadian_resident'"
        outcome: "likely_eligible"
        explanation_template_en: "You care for children under 18 and appear to be a resident of Canada for tax purposes."
        explanation_template_fr: "..."
```

Notes:

- `condition` expressions are evaluated against the `CaseProfile` (see Section 5).
- Each rule links back to a specific Act and section, supporting explainability.

### 4.6 `priority_rules.yaml` – priority scoring

Example configuration:

```yaml
weights:
  base: 0.2
  imminent_income_loss: 0.4
  has_children: 0.2
  has_disability_or_accommodation: 0.2
  high_unemployment_province: 0.1
  is_single_parent: 0.2

thresholds:
  high_priority: 0.8
  medium_priority: 0.5

high_unemployment_provinces: ["NL", "NB", "NS", "PE"]
```

The scoring logic is implemented in Python but fully parameterised by this file, so policy teams can adjust weights without touching code.

### 4.7 `test_cases.json` – test corpus

Contains multilingual example inputs and expected services (for manual or automated evaluation):

```json
[
  {
    "id": "TC_EN_001",
    "language": "en",
    "input_text": "I was laid off last week in Ontario...",
    "expected_services": ["EI_REGULAR", "CCB"]
  },
  {
    "id": "TC_FR_001",
    "language": "fr",
    "input_text": "Mon contrat de travail s'est terminé au Québec...",
    "expected_services": ["EI_REGULAR", "CCB"]
  },
  {
    "id": "TC_ZH_001",
    "language": "zh",
    "input_text": "我刚刚在安省被公司裁员，有两个小孩...",
    "expected_services": ["EI_REGULAR", "CCB"]
  }
]
```

---

## 5. Backend design (FastAPI)

### 5.1 Technology stack

- **Language**: Python 3.11
- **Framework**: FastAPI
- **Dependencies** (non‑exhaustive):
  - `fastapi`, `uvicorn`
  - `pydantic`, `python-dotenv`
  - `pyyaml`
  - `httpx`
  - `openai` (official Python client)

### 5.2 Directory layout (backend)

```text
fairroute/
  backend/
    app/
      __init__.py
      main.py
      config.py
      models.py
      llm_client.py
      service_matcher.py
      rules_engine.py
      explanation.py
      routers/
        __init__.py
        intake.py
        staff.py
        admin.py
    tests/
      test_rules_engine.py
    requirements.txt
    .env.example
```

### 5.3 Configuration (`config.py` and `.env`)

- `.env` contains:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL_NAME` (e.g. `gpt-4o-mini`)
- `config.py` uses Pydantic’s `BaseSettings` to load these values.

### 5.4 Data models (`models.py`)

Key Pydantic models:

- `CaseProfile`
  - Fields extracted from the citizen’s description:
    - `age`, `province`
    - `employment_status`, `unemployment_reason`
    - `children_count`, `youngest_child_age`
    - `is_single_parent` (bool / null)
    - `has_disability`, `needs_accommodation`
    - `preferred_language` (`"en" | "fr" | "zh" | "other"`)
    - `insurable_hours_last_52_weeks`
    - `residency_status`

- `RawIntake`
  - `{ text: str, language: Optional[str] }` – free‑text input.

- `ParsedIntakeResponse`
  - `{ case_profile: CaseProfile, follow_up_questions: List[str] }`

- `Service`
  - Structured representation of each service row in `services_demo.csv`.

- `ServiceRecommendation`
  - Contains:
    - `service_id`, `service_name`
    - `eligibility_status` (`likely_eligible`, `likely_ineligible`, `need_more_info`)
    - `explanation_client` – citizen‑facing.
    - `explanation_staff` – staff‑facing.
    - `priority_score` – 0.0 to 1.0.
    - `required_documents` – list from `program_guides.json`.
    - `open_data_sources` – program ID, legal sections, priority reasons, etc.

- `EvaluationRequest` / `EvaluationResponse`
  - Request: wraps `CaseProfile`.
  - Response: `case_profile`, `recommendations`, `proof_package_id`.

### 5.5 LLM integration (`llm_client.py`)

Two main functions:

1. `parse_case_with_llm(intake: RawIntake) -> CaseProfile`  
   - Sends system + user messages to the OpenAI Chat Completions API.
   - System prompt:
     - Defines the target JSON schema for `CaseProfile`.
     - Instructs the model to:
       - Detect language and set `preferred_language`.
       - Infer `is_single_parent` when possible (e.g. “single mom/dad/parent”, Chinese equivalents).
       - Use `null` when information is missing.
   - Uses `response_format={"type": "json_object"}` to ensure JSON output.
   - The function parses the JSON and constructs a `CaseProfile`.

2. `generate_explanation_with_llm(payload: Dict[str, Any]) -> str`  
   - Input payload:
     - `base_text` – rule‑based explanation template.
     - `extra_context` – guidance snippet from `program_guides.json`.
     - `target_language` – e.g. `"en"`, `"fr"`, `"zh"`.
   - System prompt asks the model to produce a short, friendly explanation:
     - Max ~4 sentences, around Grade‑8 reading level.
     - No legal advice; high‑level explanations only.

### 5.6 Service loading and matching (`service_matcher.py`)

- `load_services()` – parses `services_demo.csv` into `Service` objects.
- `match_services(profile, all_services)` – simple matching logic:
  - If `profile.employment_status == 'unemployed'` → include `EI_REGULAR`.
  - If `profile.children_count > 0` → include `CCB`.

This keeps the demo logic transparent and easy to extend. In future iterations, this can be replaced by embedding‑based or BERT‑based retrieval.

### 5.7 Rules engine and priority calculation (`rules_engine.py`)

#### 5.7.1 Loading configs

- `load_rules()` – reads `rules.yaml` and returns a dictionary keyed by `service_id`.
- `load_program_guides()` – reads `program_guides.json`.
- `load_priority_config()` – reads `priority_rules.yaml`.

#### 5.7.2 Eligibility evaluation

`evaluate_service(profile, service, rules_for_service, guides) -> Dict[str, Any]`:

1. Copies the `CaseProfile` into a context dictionary (`ctx`).
2. Iterates over each rule in `rules_for_service["rules"]`:
   - Evaluates `rule["condition"]` with `eval(condition, {}, ctx)` (safe enough for a local demo; would be replaced by a safer expression engine in production).
   - When a condition is `True`, marks the rule as “fired” and sets `eligibility_status` to the rule’s `outcome`.
   - For CCB: if the profile has children and `is_single_parent` is `True`, the explanation template is augmented with a sentence recognising single‑parent status.

3. Builds explanations:
   - `build_staff_explanation()` – references the legal sections that fired.
   - `build_client_explanation()` – uses LLM to turn templates into plain language.

4. Returns a dictionary including:
   - `service_id`
   - `eligibility_status`
   - `fired_rules`
   - `staff_explanation`
   - `client_explanation`
   - `guide` (documents and guidance).

#### 5.7.3 Priority scoring

`compute_priority_score(profile) -> (score: float, reasons: List[str])`:

- Starts from `base` weight.
- Adds weights from `priority_rules.yaml` when conditions match:
  - Unemployed → `imminent_income_loss`.
  - Has children → `has_children`.
  - Single parent with children → `is_single_parent`.
  - Disability / accommodation → `has_disability_or_accommodation`.
  - Province in `high_unemployment_provinces` → `high_unemployment_province`.
- Caps the score at 1.0.
- Collects human‑readable `reasons` describing which factors contributed.

These `reasons` are returned to both citizen and staff views for transparency.

### 5.8 Explanations (`explanation.py`)

- `build_staff_explanation(service, fired_rules, guide)`:
  - Outputs a concise description like:
    - `"Service: Employment Insurance – Regular Benefits (EI_REGULAR). Rule EI_BASE_ELIGIBILITY from Employment Insurance Act s.7(2) fired with outcome 'likely_eligible'. Guidance snippet available."`

- `build_client_explanation(service, fired_rules, guide, preferred_language)`:
  - Chooses the appropriate explanation template (`en`/`fr` or default to `en`).
  - Passes template + guide text to `generate_explanation_with_llm`.
  - Runs the LLM call synchronously via `asyncio.run(...)` for simplicity.

### 5.9 API endpoints (`routers/`)

#### 5.9.1 `/api/intake/parse` – POST

- Request: `RawIntake`
- Flow:
  1. `parse_case_with_llm` → `CaseProfile`.
  2. Generates `follow_up_questions`:
     - Ask for province if missing.
     - Ask for insurable hours if unemployed and hours are missing.
     - Ask whether there are children under 18 if `children_count == 0`.
     - If `children_count > 0` and `is_single_parent` is `null`, ask whether the person is the only adult caring for the children.
- Response: `ParsedIntakeResponse`.

#### 5.9.2 `/api/intake/evaluate` – POST

- Request: `EvaluationRequest` containing `case_profile`.
- Flow:
  1. Load services, rules and guides (cached).
  2. `match_services(profile, services)` → list of candidate services.
  3. `compute_priority_score(profile)` → `(score, reasons)`.
  4. For each service:
     - `evaluate_service(...)` → eligibility + explanations + guide.
     - Build `ServiceRecommendation` object with `priority_score` and `priority_reasons`.
  5. Generate a unique `CASE-UUID` ID.
  6. Write a `proof_CASE-*.json` log file into `logs/`.

- Response: `EvaluationResponse` with:
  - `case_profile`
  - `recommendations`
  - `proof_package_id` (case ID).

#### 5.9.3 `/api/staff/case/{case_id}` – GET

- Loads the `proof_CASE-*.json` file.
- Returns full case profile + recommendations.
- Used by the Staff Console.

#### 5.9.4 `/api/admin/rules` – GET

- Returns the parsed `rules.yaml` structure.
- Can be used later by a “policy studio” UI for rule exploration / simulation.

#### 5.9.5 `/health` – GET

- Simple health check endpoint.

---

## 6. Frontend design (React + Vite)

### 6.1 Technology stack

- **Framework**: React
- **Tooling**: Vite (JavaScript template)
- **Styling**: Simple CSS in `styles.css` (no CSS framework).

### 6.2 Directory layout (frontend)

```text
fairroute/
  frontend/
    src/
      App.jsx
      CitizenView.jsx
      StaffView.jsx
      main.jsx
      styles.css
    public/
    package.json
    vite.config.js
```

### 6.3 App structure

- `App.jsx`
  - Top‑level component with a simple header and view selector.
  - Views:
    - `"citizen"` → `CitizenView`
    - `"staff"` → `StaffView`

- The app title in the header references the assistant, e.g. `FairRoute Assistant`.

### 6.4 Citizen Portal (`CitizenView.jsx`)

Features:

1. **Language selector**  
   - Dropdown for `"en"`, `"fr"`, `"zh"` (Simplified Chinese).  
   - Selected value is sent to `/api/intake/parse` as a hint; the LLM also auto‑detects language.

2. **Accessibility toggles**
   - _Plain language mode_ (placeholder for more advanced features).
   - _High contrast_ mode (toggles CSS class to increase contrast).

3. **Situation description**
   - Textarea for free‑text description, seeded with an example scenario (unemployed parent in Ontario with two children).

4. **Step 1: “Understand my situation”**
   - Calls `/api/intake/parse`.
   - Shows returned `case_profile` as JSON for transparency.
   - Shows follow‑up questions (currently informational in the MVP).

5. **Optional “I am a single parent” checkbox**
   - Only visible if `caseProfile.children_count > 0`.
   - Updating this checkbox updates `caseProfile.is_single_parent` in local state.
   - When the user proceeds to evaluation, the updated profile is sent to the backend.

6. **Step 2: “Find programs for me”**
   - Calls `/api/intake/evaluate` with the `case_profile` (including any manual adjustments such as `is_single_parent`).
   - Displays:
     - Recommended programs.
     - Eligibility status.
     - Citizen‑facing explanation.
     - Required documents list.
   - Shows the `proof_package_id` for staff, for example: `(For staff, this case is logged as CASE-...)`.

### 6.5 Staff Console (`StaffView.jsx`)

Features:

1. **Case ID input**
   - Staff enter a `CASE-...` ID provided by the citizen or system.

2. **Load case**
   - Calls `/api/staff/case/{case_id}`.
   - If found, renders:
     - Left column: original `case_profile` JSON.
     - Right column: list of `recommendations`.

3. **Recommendation cards**
   - Show:
     - Service name and ID.
     - Eligibility status.
     - Priority score (percentage).
     - Priority reasons (concatenated list).
   - Expandable sections:
     - `Staff explanation` – references rules and legal sections.
     - `Client explanation` – citizen‑facing message so staff can check what the citizen saw.

### 6.6 Styling (`styles.css`)

Key ideas:

- Neutral, accessible design; focus on clarity and legibility.
- `.high-contrast` modifier class flips background/foreground colours.
- `.card` components used consistently across both views.
- Flex layout in Staff Console for side‑by‑side comparison of profile and recommendations.

---

## 7. Accessibility, transparency and fairness

### 7.1 Accessibility features

- **Multiple languages**:
  - UI language selector.
  - LLM output conditioned on `preferred_language` (English/French/Chinese).
- **Plain‑language explanations**:
  - Explanations are explicitly requested at Grade‑8 reading level.
- **High‑contrast mode**:
  - Single toggle switches to high‑contrast colour scheme.
- **JSON profile exposure**:
  - The citizen can see how the system interpreted their situation and correct it (e.g. single‑parent checkbox).

Future enhancements could include keyboard navigation checks, ARIA attributes, and screen‑reader optimisation.

### 7.2 Transparency

- Every recommendation is backed by:
  - Explicit rules with references to Acts and sections.
  - A log file (`proof_CASE-*.json`) containing all inputs and outputs.
- Staff can see which rules fired and why a given priority score was assigned.
- Citizens see:
  - A plain‑language explanation.
  - Required documents and steps to take.

### 7.3 Fairness and routing

- Priority scoring uses transparent, editable weights.
- Factors include:
  - Imminent income loss (unemployment),
  - Presence of children,
  - Single‑parent status,
  - Disability or communication barrier,
  - Province‑level unemployment context.
- Protected characteristics are not used directly; instead, the focus is on vulnerability related to economic and caregiving burdens.

A future `docs/fairness_evaluation.md` can systematically evaluate outcomes across personas using `test_cases.json` and log analysis.

---

## 8. Security and privacy

For this MVP:

- **API keys**:
  - OpenAI API key is stored only in `.env`, excluded from version control via `.gitignore`.
- **Data storage**:
  - No relational database is used.
  - Case logs are stored as JSON files under `logs/` on the local machine.
- **PII**:
  - The test cases and demo flows use synthetic or anonymised data.
  - In a real deployment, additional steps would be required:
    - Encryption at rest.
    - Strict access controls for logs.
    - Pseudonymisation and retention policies.

---

## 9. Local development workflow (summary)

For detailed instructions, see `README.md`. High‑level steps:

1. Clone the repository.
2. Setup and run the backend (Python virtualenv, dependencies, `.env`, `uvicorn`).
3. Setup and run the frontend (`npm install`, `npm run dev`).
4. Open the frontend in a browser and use both Citizen and Staff views to walk through a scenario.

---

## 10. Testing and evaluation

### 10.1 Unit / integration testing

- `backend/tests/test_rules_engine.py`
  - Can be used to test:
    - That specific `CaseProfile` inputs trigger expected rules.
    - Priority scores for key personas (e.g. single parent vs non‑single parent).

Potential directions:

- Add tests that load `data/test_cases.json` and assert:
  - Which services are matched.
  - Ranges for priority scores.
  - Presence of certain strings in explanations (without asserting exact LLM text).

### 10.2 Manual evaluation

- Use `test_cases.json` to simulate personas in different languages.
- Check:
  - Is the extracted `CaseProfile` correct?
  - Are matched programs sensible?
  - Are explanations accurate but non‑legalistic?
  - Does priority scoring align with fairness goals?

### 10.3 Fairness analysis (future work)

- Write a small script or notebook that reads all `logs/proof_*.json`:
  - Group by attributes (e.g. single‑parent vs not, disability vs not).
  - Compare distribution of priority scores.
  - Look for system biases or unintended effects of weighting.

---

## 11. Extensibility and future work

Areas for extension beyond the MVP:

1. **More services and programs**
   - Ingest a larger subset of GC Service Inventory and GC InfoBase.
   - Expand `rules.yaml` and `program_guides.json` accordingly.

2. **Dynamic rules editing**
   - Build an admin “policy studio” front‑end that:
     - Visualises rules from `/api/admin/rules`.
     - Allows policy analysts to propose changes and run simulations.

3. **Better service matching**
   - Replace simple heuristics with:
     - Embedding‑based semantic search over service descriptions.
     - A trained classifier or re‑ranker.

4. **Workflow integration**
   - Connect FairRoute outputs to internal ticketing systems for queue routing.
   - Add status updates and feedback loops for learning.

5. **Stronger privacy and security**
   - JWT‑based authentication for staff endpoints.
   - Encrypted storage and role‑based access control.

6. **Model adaptation**
   - Experiment with domain‑specific fine‑tuning or tool‑calling for:
     - More accurate `CaseProfile` extraction.
     - Richer explanation templates.

---

## 12. Non‑goals and limitations

- FairRoute does **not**:
  - Make binding legal eligibility decisions.
  - Replace human caseworkers.
  - Provide exhaustive coverage of all Canadian benefit programs.

- The rules and thresholds in this MVP are:
  - Simplified and illustrative.
  - Intended to demonstrate how a government team could configure and audit them, not to be used in production “as is”.

---

## 13. Summary

FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant is a full‑stack prototype that demonstrates how a government could:

- Use LLMs to understand citizens in their own words.
- Combine LLMs with explicit, auditable rules and open data.
- Provide both citizens and staff with clear, fair and explainable guidance.

This `docs/design.md` acts as the technical “assembly manual” for the system. For quick setup instructions and a higher‑level overview, see `README.md`. For deeper dives on accessibility and fairness, see `docs/a11y_checklist.md` and `docs/fairness_evaluation.md` (once created).
