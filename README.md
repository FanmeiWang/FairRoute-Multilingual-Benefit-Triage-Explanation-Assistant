# FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant

FairRoute is a **Multilingual Benefit Triage, Routing & Explanation Assistant** that helps newly unemployed parents – including single parents and clients with language or accessibility needs – navigate **Employment Insurance (EI)**, the **Canada Child Benefit (CCB)** and related programs.

FairRoute combines:

- **LLM-powered natural language understanding** of citizen stories,
- **Open data and explicit rules** (e.g. from GC Service Inventory, GC InfoBase and legislation),
- **Transparent explanations and evidence packages** for staff,
- **Fairness- and accessibility-aware triage** (multilingual, disability/accommodation signals, single-parent flag).

This repository contains the **minimum viable product (MVP)** implementation submitted to the **G7 GovAI Grand Challenge (Problem 4 – public-facing digital service scenario)**.

---

## 1. Problem context

When someone in Canada suddenly loses their job and has children to support, it can be very hard to:

- Understand **which federal benefits** might apply (EI, CCB, others),
- Figure out **what information and documents** are required,
- Communicate clearly if they have **limited English/French** or accessibility needs,
- Trust that they are being treated **fairly** compared to other clients.

Front-line staff also need to:

- Triage cases **fairly and consistently**,
- See **why** a recommendation was made (rules, acts, open data),
- Quickly understand **priority factors** (children, disability, single parent, province, etc.).

**FairRoute** addresses this by offering a single assistant that:

1. Understands free-form citizen narratives in multiple languages;
2. Extracts a structured case profile for benefit triage;
3. Matches relevant services and applies explicit rules;
4. Produces citizen-friendly and staff-facing explanations; and
5. Logs an evidence package for later review.

---

## 2. Objectives

FairRoute is designed to:

- **Support newly unemployed parents** (including single parents) with clear guidance on EI and CCB.
- **Handle multilingual inputs** (English, French, Simplified Chinese in this MVP; easily extensible).
- **Surface accessibility and accommodation needs**, including disability and communication barriers.
- **Apply transparent, rule-based eligibility logic**, referencing the EI Act and Income Tax Act.
- **Generate explanations at two levels**:
  - Plain-language guidance for citizens;
  - Rule- and source-based rationales for staff.
- **Produce an auditable evidence package** (JSON proof files per case).
- Demonstrate a pattern that can be **scaled to more programs and internal case management systems**.

---

## 3. System architecture

At a high level, FairRoute consists of:

- **Backend (FastAPI / Python)**  
  - `CaseProfile` model representing the structured intake (age, province, employment status, children, disability, single-parent flag, etc.).  
  - LLM client (OpenAI Chat Completions API) used for:
    - Parsing free-form narratives into `CaseProfile`;
    - Turning rule templates and guidance into readable explanations.
  - Rule engine and priority scoring:
    - Loads rules from `config/rules.yaml`;
    - Evaluates conditions per service (e.g. EI, CCB);
    - Computes a **priority score** based on unemployment, children, disability/accommodation, province, and single-parent status.
  - Logging of **proof packages** in `logs/`.

- **Frontend (React, Vite)**  
  - **Citizen portal**:
    - Text area for describing their situation in their own words;
    - Controls for plain-language mode and high-contrast mode;
    - Shows the parsed case profile for transparency;
    - Allows toggling “I am a single parent” when children are present;
    - Displays suggested programs, eligibility status, and what to prepare.
  - **Staff console**:
    - Load a case by ID (`CASE-...`);
    - Inspect the original `CaseProfile`;
    - Review recommendations, priority score, reasons, and detailed staff explanation.

- **Open data & configuration**  
  - Service catalogue subset (`data/services_demo.csv`);
  - Program information (`data/programs.csv`);
  - Program guidance (eligibility text, required documents) (`data/program_guides.json`);
  - Rules and priority weights (`config/rules.yaml`, `config/priority_rules.yaml`).

The architecture is intentionally **modular**: new services, rules, languages and personas can be added by editing configuration files rather than rewriting core logic.

---

## 4. Getting started

### 4.1 Prerequisites

You will need:

- **Python** 3.11 (or compatible 3.10+)
- **Node.js** 18+ and **npm**
- An **OpenAI API key** (for the LLM calls)
- Git (to clone this repository)

This MVP is designed to run locally on macOS, Linux, or Windows.

---

### 4.2 Clone the repository

From your terminal:

~~~bash
git clone <your_github_repo_url> fairroute
cd fairroute
~~~

Replace `<your_github_repo_url>` with the URL of your own GitHub repository for this project.

---

### 4.3 Backend setup

From the `backend/` directory:

1. **Create and activate a virtual environment**

~~~bash
cd backend
python -m venv .venv

# On macOS / Linux:
source .venv/bin/activate

# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
~~~

2. **Install Python dependencies**

~~~bash
pip install -r requirements.txt
~~~

3. **Create `.env` based on `.env.example`**

~~~bash
cp .env.example .env
~~~

4. **Edit `.env`**

~~~env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_NAME=gpt-4o-mini
~~~

5. **Start the backend server**

~~~bash
uvicorn app.main:app --reload
~~~

The API will be available at:

- OpenAPI docs: http://localhost:8000/docs  
- Health check: http://localhost:8000/health

---

### 4.4 Frontend setup

From the `frontend/` directory:

~~~bash
cd ../frontend
npm install
npm run dev
~~~

By default, the dev server runs at:

- http://localhost:5173

You can now:

- Visit the **Citizen portal** in your browser (default view).
- Switch to the **Staff console** via the navigation buttons at the top.

---

### 4.5 End-to-end flow (quick demo)

1. Ensure the **backend** is running at `http://localhost:8000`.
2. Start the **frontend** dev server (`npm run dev`) and open `http://localhost:5173`.
3. In the **Citizen portal**:
   - Select a language (e.g. English or Simplified Chinese).
   - Paste a scenario such as:  
     “I was laid off last week in Ontario. I have two kids, 4 and 7, and I’m worried about paying the bills.”
   - Click **“1. Understand my situation”**:
     - The backend calls the LLM to parse the narrative into a `CaseProfile`.
     - The parsed structure is displayed in JSON form for transparency.
   - If children are present, optionally check:  
     **“I am the only adult primarily caring for these children (single parent).”**
   - Click **“2. Find programs for me”**:
     - FairRoute matches relevant services (EI, CCB);
     - Runs the rule engine;
     - Computes a priority score (with extra weight for single parents, disability/accommodation, etc.);
     - Generates plain-language explanations and a checklist of documents.
   - At the bottom, note the case ID, e.g. `CASE-1234abcd`.

4. Switch to the **Staff console**:
   - Enter `CASE-1234abcd` (or your own case ID) and click **Load**.
   - Inspect:
     - The original `CaseProfile`,
     - Recommended services,
     - Priority score and reasons,
     - Staff and citizen explanations,
     - Open-data-based evidence (program ID, act sections, priority reasons).

This demonstrates **triage, routing, explanation and evidence logging** across both citizen and staff views.

---

## 5. Repository structure

A simplified view of the repository:

~~~text
FairRoute-Multilingual-Benefit-Triage-Explanation-Assistant/
  backend/
    app/
      __init__.py
      main.py               # FastAPI entrypoint
      config.py             # Settings (.env)
      models.py             # Pydantic models (CaseProfile, etc.)
      llm_client.py         # OpenAI client & prompts
      service_matcher.py    # Simple service matching logic
      rules_engine.py       # Rule evaluation & priority scoring
      explanation.py        # Staff & citizen explanations
      routers/
        __init__.py
        intake.py           # /api/intake/parse & /api/intake/evaluate
        staff.py            # /api/staff/case/{case_id}
        admin.py            # /api/admin/rules (read-only)
    tests/
      test_rules_engine.py  # Example tests (can be extended)
    .env.example
    requirements.txt

  frontend/
    src/
      App.jsx               # Top-level router (Citizen / Staff views)
      CitizenView.jsx       # Citizen portal UI
      StaffView.jsx         # Staff console UI
      main.jsx              # React entry
      styles.css            # Basic styling & accessibility toggles
    public/
    vite.config.js
    package.json

  data/
    services_demo.csv       # Demo service catalogue (EI, CCB)
    programs.csv            # Program metadata (GC InfoBase subset)
    program_guides.json     # Eligibility blurbs & document checklists
    test_cases.json         # Sample narratives for manual / automated tests

  config/
    rules.yaml              # Service-level eligibility rules
    priority_rules.yaml     # Priority scoring weights & thresholds

  logs/
    proof_*.json            # Evidence packages written at runtime

  docs/
    design.md
    a11y_checklist.md
    fairness_evaluation.md

  README.md
  .gitignore
~~~

---

## 6. Key components

### 6.1 CaseProfile and intake parsing

The **CaseProfile** model captures the structured attributes of a case, including:

- `age`, `province`
- `employment_status`, `unemployment_reason`
- `children_count`, `youngest_child_age`
- `is_single_parent` (true / false / null)
- `has_disability`, `needs_accommodation`
- `preferred_language` (en, fr, zh, other)
- `insurable_hours_last_52_weeks`
- `residency_status` (canadian_resident, temporary_resident, unknown)

The `/api/intake/parse` endpoint:

- Takes a free-form narrative (`RawIntake`);
- Calls the LLM to produce a strict JSON object matching the `CaseProfile` schema;
- Optionally generates follow‑up questions (e.g. missing province, missing hours, unknown children status, unknown single-parent flag).

### 6.2 Service matching and rules

The `/api/intake/evaluate` endpoint:

1. Loads all services from `data/services_demo.csv`.
2. Uses simple deterministic logic to match candidate services:
   - EI if the client is unemployed;
   - CCB if there are children under 18.
3. For each candidate service:
   - Applies rules from `config/rules.yaml` (e.g. EI base eligibility, need more information, voluntary quit; CCB base eligibility, no children).
   - Uses the program guidance in `data/program_guides.json` to attach:
     - Eligibility blurbs,
     - Required document lists.

For CCB, when the profile indicates **single parent + children**, an extra sentence is appended to the explanation template, making it explicit that this benefit may be particularly important for single-parent families.

### 6.3 Priority scoring and fairness signals

The **priority score** is computed using `config/priority_rules.yaml`, with weights such as:

- `base`
- `imminent_income_loss` (unemployed)
- `has_children`
- `has_disability_or_accommodation`
- `high_unemployment_province`
- `is_single_parent`

Reasons are recorded alongside the numeric score (e.g. “Imminent income loss”, “Caring for children”, “Single parent caring for children”, “Disability or communication barrier”).

This makes **triage decisions auditable** and open to future tuning or fairness analysis.

### 6.4 Explanations and evidence packages

For each recommendation, FairRoute generates:

- **Citizen-facing explanation**  
  Short, friendly text at approximately Grade 8 reading level, in the client’s preferred language (English, French, or Simplified Chinese in this MVP).

- **Staff-facing explanation**  
  A more technical rationale indicating which rules fired and which act sections were referenced.

Each evaluation also writes a **proof package** to `logs/proof_<case_id>.json`:

- `case_id`
- Full `case_profile`
- List of `recommendations` (including explanations, priority score, reasons, and open-data references).

Staff can retrieve the package via `/api/staff/case/{case_id}` and review it in the **Staff console**.

---

## 7. Data and rules (demo configuration)

This MVP uses a **minimal subset** of real federal services and programs for demonstration purposes.

- `data/services_demo.csv`  
  - EI Regular Benefits  
  - Canada Child Benefit (CCB)

- `data/programs.csv`  
  - EI Program (Employment and Social Development Canada)  
  - Canada Child Benefit Program (Canada Revenue Agency)

- `data/program_guides.json`  
  - Concise eligibility text in English and French (paraphrased from official websites);  
  - Required document lists (e.g. SIN, ROE, children’s birth certificates, immigration proof).

- `config/rules.yaml`  
  - EI rules based on high-level conditions from the EI Act (e.g. loss of job through no fault of one’s own, minimum insurable hours, voluntary quit).
  - CCB rules based on high-level conditions from the Income Tax Act (e.g. child under 18, residency for tax purposes).

- `config/priority_rules.yaml`  
  - A simple, explicit scoring model that is easy to inspect and adjust.

These files are intended to show how rules and open data can be externalised and updated without modifying code.

---

## 8. Example user journeys

### 8.1 Newly unemployed parent (multilingual)

1. A parent who was laid off in Ontario writes their story in **Chinese**:
   - “I was laid off, I live in Ontario, I have two kids (4 and 7), my English is not good…”
2. FairRoute detects the language, parses the narrative, and sets:
   - `employment_status = "unemployed"`
   - `children_count = 2`, `youngest_child_age = 4`
   - `preferred_language = "zh"`
3. The citizen ticks the **“single parent”** checkbox if applicable.
4. FairRoute recommends EI and CCB, gives clear next steps and a checklist, in the selected language.

### 8.2 Staff reviewing a queue

1. A staff member receives a list of case IDs from upstream channels.
2. In the Staff console, they load `CASE-...` for each.
3. They see:
   - The original profile (no need to re-ask basic questions);
   - Which services are suggested and why;
   - Priority score and reasons (e.g. single parent, children, disability, high-unemployment province).
4. This helps them **triage fairly** and explain decisions to the client if needed.

---

## 9. Accessibility, inclusion and multilingual support

FairRoute incorporates:

- **Plain-language mode** (front-end toggle)  
  The citizen view is designed with simple language and short explanations.

- **High-contrast mode** (front-end toggle)  
  Improves readability for users with low vision.

- **Multilingual support**  
  The MVP uses English, French and Simplified Chinese as examples:
  - Input can be written in any of these languages;
  - Explanations are generated in the client’s preferred language.

- **Disability and accommodation signals**  
  The `CaseProfile` encodes `has_disability` and `needs_accommodation` flags, which:
  - Affect priority scoring;
  - Can be surfaced in staff explanations to encourage proactive accommodations.

- **Single-parent awareness**  
  Explicit `is_single_parent` flag, surfaced in:
  - Priority scoring;
  - Explanations for CCB (emphasising its potential importance).

These design choices are motivated by the **fairness and accessibility objectives** of the G7 GovAI Grand Challenge.

---

## 10. Evaluation, limitations and future work

This MVP is **not production-ready**. It is intended as an illustrative prototype.

Known limitations and possible extensions:

- **Rule coverage**  
  - Currently focuses on EI Regular and CCB;  
  - Future work: add sickness benefits, disability benefits, provincial programs, and more nuanced rule sets.

- **LLM reliability**  
  - Parsing and explanation quality depend on the LLM;  
  - Future work: add **validation and guardrails**, plus small evaluation suites using `data/test_cases.json`.

- **Performance and scaling**  
  - Designed for a small demo volume;  
  - Future work: caching, more efficient batching, and integration with real queues.

- **Fairness evaluation**  
  - The repository includes `docs/fairness_evaluation.md` as a starting point;  
  - Future work: run systematic audits by language, disability, single-parent status, and region.

Despite these limitations, FairRoute demonstrates a **concrete pattern** for combining LLMs with open data and explicit rules to support fair, explainable digital services.

---

## 11. Alignment with the G7 GovAI Grand Challenge

FairRoute is aligned with the challenge aims by:

- Demonstrating a **practical use case** for Government AI that directly supports vulnerable residents (newly unemployed parents).
- Combining **generative AI** with **transparent rules and open data**, rather than opaque end‑to‑end models.
- Surfacing **fairness and accessibility features** (multilingual support, disability and accommodation flags, single-parent priority).
- Providing an **auditable trail** (proof packages) to support accountability and oversight.
- Being designed as a **reusable pattern**:
  - The same architecture can support:
    - Internal service queues,
    - Other benefit domains,
    - Other languages and accessibility profiles.

---

## 12. License and acknowledgments

- You may choose an appropriate license for your own repository (for example, MIT or Apache‑2.0).
- This MVP uses:
  - The **OpenAI API** for language understanding and explanation generation.
  - Publicly available descriptions of **Employment Insurance** and the **Canada Child Benefit**, paraphrased for this prototype.
  - The architectural problem framing from the **G7 GovAI Grand Challenge (Problem 4 – public-facing digital services)**.

If you adapt or extend FairRoute, please consider:

- Documenting the policy and legal sources you use;
- Sharing improvements to rules, evaluation scripts, or accessibility features.

---

**Contact / Notes**

- This repository is an MVP and should **not** be used for real eligibility decisions without:
  - Formal legal review,
  - Policy validation,
  - Security and privacy assessments,
  - Robust fairness evaluation.
- For the purposes of the G7 GovAI Grand Challenge, it illustrates how **multilingual triage, routing and explanation** can be implemented in a concrete, inspectable way.

## Ownership and copyright

FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant was created by  
**Fanmei Wang and Alexander YZ Fu** (2025).

Unless otherwise noted, all source code and documentation in this repository is  
Copyright (c) 2025 Fanmei Wang and Alexander YZ Fu. All rights reserved.

# FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant

FairRoute is a **Multilingual Benefit Triage, Routing & Explanation Assistant** that helps newly unemployed parents – including single parents and clients with language or accessibility needs – navigate **Employment Insurance (EI)**, the **Canada Child Benefit (CCB)** and related programs.

FairRoute combines:

- **LLM-powered natural language understanding** of citizen stories,
- **Open data and explicit rules** (e.g. from GC Service Inventory, GC InfoBase and legislation),
- **Transparent explanations and evidence packages** for staff,
- **Fairness- and accessibility-aware triage** (multilingual, disability/accommodation signals, single-parent flag).

This repository contains the **minimum viable product (MVP)** implementation submitted to the **G7 GovAI Grand Challenge (Problem 4 – public-facing digital service scenario)**.

---

## 1. Problem context

When someone in Canada suddenly loses their job and has children to support, it can be very hard to:

- Understand **which federal benefits** might apply (EI, CCB, others),
- Figure out **what information and documents** are required,
- Communicate clearly if they have **limited English/French** or accessibility needs,
- Trust that they are being treated **fairly** compared to other clients.

Front-line staff also need to:

- Triage cases **fairly and consistently**,
- See **why** a recommendation was made (rules, acts, open data),
- Quickly understand **priority factors** (children, disability, single parent, province, etc.).

**FairRoute** addresses this by offering a single assistant that:

1. Understands free-form citizen narratives in multiple languages;
2. Extracts a structured case profile for benefit triage;
3. Matches relevant services and applies explicit rules;
4. Produces citizen-friendly and staff-facing explanations; and
5. Logs an evidence package for later review.

---

## 2. Objectives

FairRoute is designed to:

- **Support newly unemployed parents** (including single parents) with clear guidance on EI and CCB.
- **Handle multilingual inputs** (English, French, Simplified Chinese in this MVP; easily extensible).
- **Surface accessibility and accommodation needs**, including disability and communication barriers.
- **Apply transparent, rule-based eligibility logic**, referencing the EI Act and Income Tax Act.
- **Generate explanations at two levels**:
  - Plain-language guidance for citizens;
  - Rule- and source-based rationales for staff.
- **Produce an auditable evidence package** (JSON proof files per case).
- Demonstrate a pattern that can be **scaled to more programs and internal case management systems**.

---

## 3. System architecture

At a high level, FairRoute consists of:

### Backend (FastAPI / Python)

- `CaseProfile` model representing the structured intake (age, province, employment status, children, disability, single-parent flag, etc.).
- LLM client (OpenAI Chat Completions API) used for:
  - Parsing free-form narratives into `CaseProfile`;
  - Turning rule templates and guidance into readable explanations.
- Rule engine and priority scoring:
  - Loads rules from `config/rules.yaml`;
  - Evaluates conditions per service (e.g. EI, CCB);
  - Computes a **priority score** based on unemployment, children, disability/accommodation, province, single-parent status and rule outcomes.
- Logging of **proof packages** in `logs/`.

### Frontend (React, Vite)

- **Citizen view**:
  - Text area for describing their situation in their own words;
  - (MVP) English UI, with multilingual narrative parsing;
  - Shows only citizen-friendly program cards (no JSON);
  - Displays suggested programs, friendly status labels, and what to prepare.
- **Staff view**:
  - Uses the same intake text and backend as the citizen view;
  - Shows the parsed `CaseProfile` in JSON for transparency (behind a collapsible “Technical JSON” section);
  - Shows recommendations, **ticket priority** (score / band / reasons / human‑review flag),
    and detailed staff explanations and rule hits.

### Open data & configuration

- Service catalogue subset (`data/services_demo.csv`);
- Program information (`data/programs.csv`);
- Program guidance (eligibility text, required documents) (`data/program_guides.json`);
- Rules and priority weights (`config/rules.yaml`, `config/priority_rules.yaml`).

The architecture is intentionally **modular**: new services, rules, languages and personas can be added by editing configuration files rather than rewriting core logic.

---

## 4. Getting started

### 4.1 Prerequisites

You will need:

- **Python** 3.11 (or compatible 3.10+)
- **Node.js** 18+ and **npm**
- An **OpenAI API key** (for the LLM calls)
- Git (to clone this repository)

This MVP is designed to run locally on macOS, Linux, or Windows.

---

### 4.2 Clone the repository

From your terminal:

~~~bash
git clone <your_github_repo_url> fairroute
cd fairroute
~~~

Replace `<your_github_repo_url>` with the URL of your own GitHub repository for this project.

---

### 4.3 Backend setup

From the `backend/` directory:

1. **Create and activate a virtual environment**

~~~bash
cd backend
python -m venv .venv

# On macOS / Linux:
source .venv/bin/activate

# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
~~~

2. **Install Python dependencies**

~~~bash
pip install -r requirements.txt
~~~

3. **Create `.env` based on `.env.example`**

~~~bash
cp .env.example .env
~~~

4. **Edit `.env`**

~~~env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_NAME=gpt-4o-mini
~~~

5. **Start the backend server**

~~~bash
uvicorn app.main:app --reload
~~~

The API will be available at:

- OpenAPI docs: http://localhost:8000/docs  
- Health check: http://localhost:8000/health

---

### 4.4 Frontend setup

From the `frontend/` directory:

~~~bash
cd ../frontend
npm install
npm run dev
~~~

By default, the dev server runs at:

- http://localhost:5173

You can now:

- Use the **Citizen view** (default) to simulate a resident.
- Switch to the **Staff view** via the navigation tabs at the top.

---

### 4.5 End-to-end flow (quick demo)

1. Ensure the **backend** is running at `http://localhost:8000`.
2. Start the **frontend** dev server (`npm run dev`) and open `http://localhost:5173`.
3. In the **Citizen view**:
   - Paste a scenario such as:  
     “I recently lost my job in Ontario. I have a 5‑year‑old child and I want to check what benefits I might be eligible for.”
   - Click **“1. Send to /api/intake/parse”**:
     - The backend calls the LLM to parse the narrative into a `CaseProfile`.
   - Click **“2. Send to /api/intake/evaluate”**:
     - FairRoute matches relevant services (EI, CCB);
     - Runs the rule engine;
     - Computes a ticket priority score and band;
     - Generates plain-language explanations and a checklist of documents.
4. Switch to the **Staff view**:
   - See the same intake text and step buttons;
   - Scroll down to inspect:
     - The full `CaseProfile` JSON (under a collapsible “Technical JSON” block);
     - The list of candidate services and rule outcomes;
     - The **Ticket priority** card (score / band / human-review flag / reasons);
     - Program-level staff notes.

This demonstrates **triage, routing, explanation and evidence logging** across both citizen and staff views.

---

## 5. Repository structure

A simplified view of the repository:

~~~text
FairRoute-Multilingual-Benefit-Triage-Explanation-Assistant/
  backend/
    app/
      __init__.py
      main.py               # FastAPI entrypoint
      config.py             # Settings (.env)
      models.py             # Pydantic models (CaseProfile, etc.)
      llm_client.py         # OpenAI client & prompts
      service_matcher.py    # Simple service matching logic
      rules_engine.py       # Rule evaluation & priority scoring
      explanation.py        # Staff & citizen explanations
      routers/
        __init__.py
        intake.py           # /api/intake/parse & /api/intake/evaluate
        staff.py            # /api/staff/case/{case_id}
        admin.py            # /api/admin/rules (read-only)
    tests/
      test_rules_engine.py  # Example tests (can be extended)
    .env.example
    requirements.txt

  frontend/
    src/
      main.jsx              # React entry with Citizen / Staff tabs
      styles.css            # Basic styling & accessibility tweaks
    public/
    vite.config.js
    package.json

  data/
    services_demo.csv       # Demo service catalogue (EI, CCB)
    programs.csv            # Program metadata (GC InfoBase subset)
    program_guides.json     # Eligibility blurbs & document checklists
    test_cases.json         # Sample narratives for manual / automated tests

  config/
    rules.yaml              # Service-level eligibility rules
    priority_rules.yaml     # Priority scoring weights & thresholds

  logs/
    proof_*.json            # Evidence packages written at runtime

  docs/
    design.md
    a11y_checklist.md
    fairness_evaluation.md

  README.md
  .gitignore
~~~

---

## 6. Key components

### 6.1 CaseProfile and intake parsing

The **CaseProfile** model captures the structured attributes of a case, including:

- `age`, `province`
- `employment_status`, `unemployment_reason`
- `children_count`, `youngest_child_age`
- `is_single_parent` (true / false / null)
- `has_disability`, `needs_accommodation`
- `preferred_language` (en, fr, zh, other)
- `insurable_hours_last_52_weeks`
- `residency_status` (canadian_resident, temporary_resident, unknown)

The `/api/intake/parse` endpoint:

- Takes a free-form narrative (`RawIntake`);
- Calls the LLM to produce a strict JSON object matching the `CaseProfile` schema;
- Also returns follow‑up questions (e.g. missing province, missing hours, unknown children status, unknown single-parent flag).

### 6.2 Service matching and rules

The `/api/intake/evaluate` endpoint:

1. Loads all services from `data/services_demo.csv`.
2. Uses simple deterministic logic to match candidate services:
   - EI if the client is unemployed;
   - CCB if there are children under 18.
3. For each candidate service:
   - Applies rules from `config/rules.yaml` (e.g. EI base eligibility, `need_more_info`, voluntary quit; CCB base eligibility, no children).
   - Uses the program guidance in `data/program_guides.json` to attach:
     - Eligibility blurbs,
     - Required document lists.

For CCB, when the profile indicates **single parent + children**, an extra sentence is appended to the explanation template, making it explicit that this benefit may be particularly important for single-parent families.

### 6.3 Priority scoring and fairness signals (overview)

The **priority score** is computed using configuration in `config/priority_rules.yaml`.  
Conceptually, it adds points for factors such as:

- imminent income loss (unemployed for reasons like layoff / end of contract),
- presence of children (especially very young children),
- being a single parent,
- disability or accommodation needs,
- residency uncertainty (possible newcomers),
- and unresolved benefit decisions (`need_more_info`).

This results in a numeric `priority_score` plus a set of human-readable **priority reasons**.

A more detailed description of the ticket priority design is given in **Section 14**.

### 6.4 Explanations and evidence packages

For each recommendation, FairRoute generates:

- **Citizen-facing explanation**  
  Short, friendly text at approximately Grade 8 reading level, in the client’s preferred language (English, French, or Simplified Chinese in this MVP).

- **Staff-facing explanation**  
  A more technical rationale indicating which rules fired and which act sections were referenced.

Each evaluation also writes a **proof package** to `logs/proof_<case_id>.json`:

- `case_id`
- Full `case_profile`
- List of `recommendations` (including explanations, priority score, reasons, and open-data references).

Staff can retrieve the package via `/api/staff/case/{case_id}` and review it in the **Staff view**.

---

## 7. Data and rules (demo configuration)

This MVP uses a **minimal subset** of real federal services and programs for demonstration purposes.

- `data/services_demo.csv`  
  - EI Regular Benefits  
  - Canada Child Benefit (CCB)

- `data/programs.csv`  
  - EI Program (Employment and Social Development Canada)  
  - Canada Child Benefit Program (Canada Revenue Agency)

- `data/program_guides.json`  
  - Concise eligibility text in English and French (paraphrased from official websites);  
  - Required document lists (e.g. SIN, ROE, children’s birth certificates, immigration proof).

- `config/rules.yaml`  
  - EI rules based on high-level conditions from the EI Act (e.g. loss of job through no fault of one’s own, minimum insurable hours, voluntary quit).
  - CCB rules based on high-level conditions from the Income Tax Act (e.g. child under 18, residency for tax purposes).

- `config/priority_rules.yaml`  
  - A simple, explicit scoring model that is easy to inspect and adjust (see Section 14).

These files are intended to show how rules and open data can be externalised and updated without modifying code.

---

## 8. Example user journeys

### 8.1 Newly unemployed parent (multilingual)

1. A parent who was laid off in Ontario writes their story (English, French, or Chinese).
2. FairRoute detects the language, parses the narrative, and sets for example:
   - `employment_status = "unemployed"`
   - `children_count = 2`, `youngest_child_age = 4`
   - `preferred_language = "zh"`
3. The citizen goes through the two-step flow and receives friendly explanations about EI and CCB.
4. The system computes a priority score that gives extra weight to single parenthood, children, and any disability / accommodation needs.

### 8.2 Staff reviewing a queue

1. A staff member opens the **Staff view**.
2. They see the same intake text and can re-run steps 1 and 2 if needed.
3. Below, they see:
   - The structured `CaseProfile`,
   - Which services are suggested and why,
   - The **Ticket priority** card:
     - Score, band (High / Medium / Low),
     - `requires_human_review` flag,
     - Priority reasons.
4. This helps them **triage fairly** and explain decisions to the client if needed.

---

## 9. Accessibility, inclusion and multilingual support

FairRoute incorporates:

- **Plain-language citizen view**  
  Status labels are phrased as:
  - “likely eligible”
  - “likely not eligible”
  - “needs more information before we can tell”  
  instead of raw codes like `eligible` / `ineligible` / `need_more_info`.

- **High-contrast design (MVP)**  
  Simple, high-contrast layout aimed at readability.

- **Multilingual support**  
  The MVP uses English, French and Simplified Chinese as examples:
  - Input narratives can be written in any of these languages;
  - Explanations are generated in the client’s preferred language.

- **Disability and accommodation signals**  
  The `CaseProfile` encodes `has_disability` and `needs_accommodation` flags, which:
  - Affect priority scoring;
  - Can be surfaced in staff explanations to encourage proactive accommodations.

- **Single-parent awareness**  
  Explicit `is_single_parent` flag, surfaced in:
  - Priority scoring;
  - Explanations for CCB (emphasising its potential importance).

These design choices are motivated by the **fairness and accessibility objectives** of the G7 GovAI Grand Challenge.

---

## 10. Evaluation, limitations and future work

This MVP is **not production-ready**. It is intended as an illustrative prototype.

Known limitations and possible extensions:

- **Rule coverage**  
  - Currently focuses on EI Regular and CCB;  
  - Future work: add sickness benefits, disability benefits, provincial programs, and more nuanced rule sets.

- **LLM reliability**  
  - Parsing and explanation quality depend on the LLM;  
  - Future work: add **validation and guardrails**, plus small evaluation suites using `data/test_cases.json`.

- **Performance and scaling**  
  - Designed for a small demo volume;  
  - Future work: caching, more efficient batching, and integration with real queues.

- **Fairness evaluation**  
  - The repository includes `docs/fairness_evaluation.md` as a starting point;  
  - Future work: run systematic audits by language, disability, single-parent status, and region.

Despite these limitations, FairRoute demonstrates a **concrete pattern** for combining LLMs with open data and explicit rules to support fair, explainable digital services.

---

## 11. Alignment with the G7 GovAI Grand Challenge

FairRoute is aligned with the challenge aims by:

- Demonstrating a **practical use case** for Government AI that directly supports vulnerable residents (newly unemployed parents).
- Combining **generative AI** with **transparent rules and open data**, rather than opaque end‑to‑end models.
- Surfacing **fairness and accessibility features** (multilingual support, disability and accommodation flags, single-parent priority).
- Providing an **auditable trail** (proof packages) to support accountability and oversight.
- Being designed as a **reusable pattern**:
  - The same architecture can support:
    - Internal service queues,
    - Other benefit domains,
    - Other languages and accessibility profiles.

---

## 12. License and acknowledgments

- You may choose an appropriate license for your own repository (for example, MIT or Apache‑2.0).
- This MVP uses:
  - The **OpenAI API** for language understanding and explanation generation.
  - Publicly available descriptions of **Employment Insurance** and the **Canada Child Benefit**, paraphrased for this prototype.
  - The architectural problem framing from the **G7 GovAI Grand Challenge (Problem 4 – public-facing digital services)**.

If you adapt or extend FairRoute, please consider:

- Documenting the policy and legal sources you use;
- Sharing improvements to rules, evaluation scripts, or accessibility features.

---

## 13. Ownership and copyright

FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant was created by  
**Fanmei Wang and Alexander YZ Fu** (2025).

Unless otherwise noted, all source code and documentation in this repository is  
Copyright (c) 2025 Fanmei Wang and Alexander YZ Fu. All rights reserved.

---

## 14. Ticket priority & ML design

This prototype includes a simple **ML‑inspired ticket prioritisation layer** on top of the rules engine.

### 14.1 What we predict

For each intake, the backend computes a numeric `priority_score` between 0 and 1 and returns a structured
`ticket_priority` object:

~~~json
{
  "score": 0.82,
  "band": "high",
  "requires_human_review": true,
  "reasons": [
    "Client is a single parent with young children.",
    "Client is currently unemployed.",
    "Eligibility for key benefits is still uncertain (need_more_info)."
  ]
}
~~~

This object is:

- Shown in the **Staff view** as a “Ticket priority” card; and  
- Logged inside each proof package in `logs/`.

### 14.2 Features used

The score is **not** a black‑box model; it is a transparent weighted sum over a small set of interpretable
features extracted from the case profile:

- `employment_status` (employed / unemployed / self-employed / retired / unknown)
- `unemployment_reason` (layoff, end_of_contract, quit, fired_for_cause, other, unknown)
- `children_count` and `youngest_child_age`
- `is_single_parent`
- `has_disability`
- `needs_accommodation`
- `residency_status` (Canadian resident vs temporary / unknown)
- whether the rules engine reports `need_more_info` for any key program

Each feature adds or subtracts a fixed number of points. For example (simplified):

- **+0.30** if the client is a single parent with at least one child under 12  
- **+0.20** if the client is unemployed because of layoff or end of contract  
- **+0.20** if the client has a disability or needs accommodation  
- **+0.10** if the client is a recent immigrant (`residency_status == "unknown"`)  
- **+0.10** if important benefit decisions are still in `need_more_info` state  
- **−0.20** if the client is employed and not reporting urgent issues  

The raw score is then clipped to the [0, 1] interval.

The exact weights and feature flags live in `config/priority_rules.yaml`, so policy teams can review and adjust them without touching application code.

### 14.3 Priority bands and thresholds

We convert the numeric score into three priority bands:

- **High**: `score >= 0.75`  
- **Medium**: `0.40 <= score < 0.75`  
- **Low**: `score < 0.40`

These thresholds are deliberately simple and easy to tune. They reflect a qualitative policy judgement
rather than being learned from data, and can be calibrated in future with real data.

### 14.4 Human‑in‑the‑loop policy

The system never auto‑decides eligibility. Instead, the ticket priority layer is used to route cases to staff.

We set `requires_human_review = true` if **any** of the following holds:

- the band is **High**; or  
- a key program is in `need_more_info` state; or  
- rules for different programs give conflicting signals; or  
- the profile indicates disability or special accommodation needs.

In other cases, the system can safely assign a **Low** or **Medium** band and allow staff to review
these tickets as capacity allows.

### 14.5 Why this design is safe and explainable

- **No opaque black‑box**: the “model” is a transparent weighted sum of a few interpretable features.  
- Every ticket comes with a human‑readable `"reasons"` list that explains why it was given a certain priority.  
- Thresholds and weights are declared in configuration (`config/priority_rules.yaml`) and can be audited or tuned by policymakers.  
- The full case profile, rule hits and ticket priority object are logged as a **proof package** for debugging and future evaluation.  
- The same interface (`priority_score`, `band`, `requires_human_review`, `reasons`) could later be powered by a trained ML model without changing the rest of the system.
