# FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant

FairRoute is a **multilingual benefit triage, routing & explanation assistant** that helps people in Canada navigate government benefits after major life events such as job loss, having children, disability, or migration.

This MVP focuses on the journey of a **newly unemployed parent** and uses **Employment Insurance (EI)** and the **Canada Child Benefit (CCB)** as example programs, but the underlying engine is designed to be reusable for other programs, personas and ticket‑priority scenarios.

FairRoute combines:

- **LLM-powered natural language understanding** of citizen stories,
- **Open government reference information and explicit rules** (aligned with datasets such as the GC Service Inventory, GC InfoBase and federal legislation, represented here as small demo subsets),
- **Transparent explanations and evidence packages** for staff,
- **Fairness- and accessibility-aware triage** (multilingual preferences, disability/accommodation signals, single-parent flag).

This repository contains the **minimum viable product (MVP)** implementation submitted to the **G7 GovAI Grand Challenge (Problem 4 – public-facing digital service scenario)**.

---

## 1. Problem context and objectives

When someone in Canada goes through a major life change – for example **suddenly losing their job**, **having children**, or **living with a disability** – it can be very hard to:

- Understand **which federal benefits** might apply (EI, CCB, others),
- Figure out **what information and documents** are required,
- Communicate clearly if they have **limited English/French** or accessibility needs,
- Trust that they are being treated **fairly** compared to other clients.

Front-line staff also need to:

- Triage cases **fairly and consistently**,
- See **why** a recommendation was made (rules, acts, open data),
- Quickly understand **priority factors** (children, disability, single parent, province, etc.),
- Work with tools that are **auditable** and easy to integrate into existing workflows.

In this MVP, we focus on one concrete scenario – a newly unemployed parent with children – and two flagship programs (EI and CCB) to make the pattern tangible. However, the same architecture can be extended to other events (e.g. disability, retirement, newcomers) by adding configuration rather than rewriting core code.

**FairRoute** is designed to:

- **Support newly unemployed parents** (including single parents) with clear guidance on EI and CCB as an initial demo scenario.
- **Handle multilingual inputs** (English, French, Simplified Chinese in this MVP; easily extensible to other languages).
- **Surface accessibility and accommodation needs**, including disability and communication barriers.
- **Apply transparent, rule-based eligibility logic**, referencing the EI Act and Income Tax Act where relevant.
- **Generate explanations at two levels**:
  - Plain-language guidance for citizens;
  - Rule- and source-based rationales for staff.
- **Produce an auditable evidence package** (JSON proof files per case).
- Demonstrate a pattern that can be **scaled to more programs, life events, and internal case management systems** (e.g. ticket priority, routing and explanation in other domains).

---

## 2. System architecture (current MVP)

FairRoute is implemented as a small full-stack application.

### 2.1 Backend (FastAPI / Python)

- `CaseProfile` model representing the structured intake (age, province, employment status, children, disability, single-parent flag, language preference, residency status, etc.).
- LLM client (OpenAI Chat Completions API) used for:
  - Parsing free-form narratives into `CaseProfile`,
  - Turning rule templates and guidance into readable explanations.
- Rule engine and ticket-priority scoring:
  - Loads service definitions and rules from `config/rules.yaml`,
  - Evaluates conditions per service (EI, CCB),
  - Computes a **ticket priority** (`score`, `band`, `requires_human_review`, `reasons`) based on unemployment, children, single-parent status, disability/accommodation, residency, and `need_more_info` outcomes.
- Logging of **proof packages** (`logs/proof_*.json`) containing the case profile and recommendations, referenced by `proof_package_id`.
- Extra read-only APIs:
  - `/api/staff/case/{case_id}` to fetch a stored proof package by ID,
  - `/api/admin/rules` to inspect the loaded rule configuration.

### 2.2 Frontend (React + Vite)

- Single-page React app (`frontend/src/main.jsx`) with two tabs:
  - **Citizen view** – the main demo flow for residents,
  - **Staff view** – a technical view for staff, reviewers and judges.
- Shared intake area:
  - Textarea for describing the situation in the client’s own words,
  - Two buttons that call the backend:
    - `POST /api/intake/parse`,
    - `POST /api/intake/evaluate`.

#### Citizen view (MVP)

- Step 1: **“Understand my situation”**
  - Sends the narrative to `/api/intake/parse`,
  - Receives a `case_profile` and pre-fills a set of **clarifying questions** (front-end controlled): province, age, employment, unemployment reason, children, single-parent status, disability/accommodation flags, preferred language, residency status, etc.
- Clarifier flow:
  - One question per step (“Quick check” wizard),
  - Answers are written back into the `case_profile` before Step 2.
- Step 2: **“Check my benefit options”**
  - Sends `{ case_profile: ... }` to `/api/intake/evaluate`,
  - Displays citizen-friendly cards for EI / CCB:
    - Status (“likely eligible”, “likely not eligible”, “we need more information”),
    - Plain-language explanation,
    - Suggested documents to prepare.
- After Step 2, a summary section shows **each clarifying question and the user’s answer** in human-readable form.

#### Staff view (MVP)

The Staff tab reuses the most recent evaluation from the same browser session:

- **Case profile table** – all fields and their values in a simple grid.
- **Clarifying questions and answers** – same list as Citizen view, but formatted for staff.
- **Backend follow-up questions** – any extra questions returned by `/api/intake/parse`.
- **Ticket priority card** – shows:
  - `score` (0–1, with 2-decimal display),
  - `band` (“high”, “medium”, “low”),
  - `requires_human_review` flag,
  - Human-readable `reasons`.
- **Program recommendations (staff view)** – for each service, shows:
  - `eligibility_status`,
  - Staff-oriented explanation (rules / act sections),
  - Optional `rule_hits` list where available.
- **Raw JSON** – a collapsible section with the full `parseResult` and `evalResult` payload for auditors.

### 2.3 Open data & configuration

- `data/services_demo.csv` – demo service catalogue (EI Regular, CCB).
- `data/program_guides.json` – short eligibility blurbs and required document lists.
- `config/rules.yaml` – service-level eligibility rules.
- `config/priority_rules.yaml` – ticket-priority weights and thresholds.

The architecture is intentionally **modular**: new services, rules, languages and personas can be added by editing configuration files rather than rewriting core logic.

In this MVP, all data under `data/` and `config/` is a small, hand‑curated demo subset and paraphrased summaries of public Canada.ca descriptions for EI and CCB. These files are **schema‑compatible with** open datasets such as the GC Service Inventory and GC InfoBase, but are not full or live copies of those datasets. They are intended to illustrate how a production team could plug real open data into the same pattern.

---

## 3. Accessibility & inclusion features

The current MVP UI includes an explicit **Accessibility panel** in the left sidebar (desktop layout):

- **Dark mode toggle** – deep blue theme for low-light or light sensitivity.
- **High-contrast toggle** – black/white high-contrast theme for low-vision users.
- **Font size slider** – scales the root font-size for the whole app.
- **Line-height slider** – increases spacing between lines to reduce visual crowding.
- Two presets:
  - **“Easy reading”** – slightly larger text and line-spacing,
  - **“Reset settings”** – back to default.

From a data perspective, the `CaseProfile` tracks:

- `has_disability`,
- `needs_accommodation`,
- `is_single_parent`,
- `preferred_language` (`en`, `fr`, `zh`, `other`),

all of which feed into ticket-priority and staff explanations.

---

## 4. Getting started

### 4.1 Prerequisites

You will need:

- **Python** 3.11 (or compatible 3.10+),
- **Node.js** 18+ and **npm**,
- An **OpenAI API key** (for the LLM calls),
- Git (to clone this repository).

This MVP is designed to run locally on macOS, Linux, or Windows.

### 4.2 Clone the repository

Commands:

    git clone https://github.com/FanmeiWang/FairRoute-Multilingual-Benefit-Triage-Explanation-Assistant fairroute
    cd fairroute

### 4.3 Backend setup

From the `backend/` directory:

Create and activate a virtual environment:

    cd backend
    python -m venv .venv

On macOS / Linux:

    source .venv/bin/activate

On Windows (PowerShell):

    .venv\Scripts\Activate.ps1

Install Python dependencies:

    pip install -r requirements.txt

Create `.env` based on `.env.example`:

    cp .env.example .env

Edit `.env`:

    OPENAI_API_KEY=your_openai_api_key_here
    OPENAI_MODEL_NAME=gpt-4o-mini

Start the backend server:

    uvicorn app.main:app --reload

The API will be available at:

- OpenAPI docs: http://localhost:8000/docs  
- Health check: http://localhost:8000/health

### 4.4 Frontend setup

From the `frontend/` directory:

    cd ../frontend
    npm install
    npm run dev

By default, the dev server runs at:

- http://localhost:5173

You can now:

- Use the Citizen view (default) to simulate a resident.
- Switch to the Staff view via the navigation tabs at the top.

---

## 5. End-to-end flow (quick demo)

Ensure the backend is running at `http://localhost:8000`.  
Start the frontend dev server and open `http://localhost:5173`.

In the **Citizen view**:

- Paste a scenario such as:  
  “I recently lost my job in Ontario. I have a 5-year-old child and I want to check what benefits I might be eligible for.”
- Click **“1. Understand my situation”**:
  - The backend calls the LLM to parse the narrative into a `CaseProfile`.
- Answer the clarifying questions (province, age, employment, children, single-parent, disability, etc.).
- Click **“2. Check my benefit options”**:
  - FairRoute matches relevant services (EI, CCB),
  - Runs the rule engine and ticket-priority scoring,
  - Generates plain-language explanations and a checklist of documents.

Switch to the **Staff view**:

- See the same intake text and step buttons,
- Inspect:
  - The full `CaseProfile` table,
  - Clarifying questions and answers,
  - The Ticket priority card (score / band / human-review flag / reasons),
  - Program-level staff notes and raw JSON.

This demonstrates triage, routing, explanation and evidence logging across both citizen and staff views.

---

## 6. Repository structure (current MVP)

    FairRoute-Multilingual-Benefit-Triage-Explanation-Assistant/
      backend/
        app/
          __init__.py
          main.py               # FastAPI entrypoint
          config.py             # Settings (.env)
          models.py             # Pydantic models (CaseProfile, etc.)
          llm_client.py         # OpenAI client & prompts
          service_matcher.py    # Simple service matching logic
          rules_engine.py       # Rule evaluation & ticket priority
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
          main.jsx              # React entry with Citizen / Staff tabs + accessibility panel
          style.css             # Styling & accessibility tweaks
        public/
        vite.config.js
        package.json

      data/
        services_demo.csv       # Demo service catalogue (EI, CCB)
        programs.csv            # Program metadata (optional)
        program_guides.json     # Eligibility blurbs & document checklists
        test_cases.json         # Sample narratives for tests

      config/
        rules.yaml              # Service-level eligibility rules
        priority_rules.yaml     # Ticket-priority weights & thresholds

      logs/
        proof_*.json            # Evidence packages written at runtime

      docs/
        design.md
        a11y_checklist.md
        fairness_evaluation.md

      README.md
      .gitignore

---

## 7. Key components

### 7.1 CaseProfile and intake parsing

The **CaseProfile** model captures the structured attributes of a case, including:

- `age`, `province`,
- `employment_status`, `unemployment_reason`,
- `children_count`, `youngest_child_age`,
- `is_single_parent` (true / false / null),
- `has_disability`, `needs_accommodation`,
- `preferred_language` (`en`, `fr`, `zh`, `other`),
- `insurable_hours_last_52_weeks`,
- `residency_status` (e.g. `canadian_resident`, `permanent_resident`, `temporary_resident`, `refugee_claimant`, `other`, `unknown`).

`POST /api/intake/parse`:

- Takes a free-form narrative (`RawIntake`),
- Calls the LLM to produce a strict JSON object matching the `CaseProfile` schema,
- Returns both the `case_profile` and a list of backend follow-up questions.

### 7.2 Service matching & rules

`POST /api/intake/evaluate`:

1. Loads all services from `data/services_demo.csv`,
2. Uses deterministic logic to narrow down candidate services (EI if unemployed, CCB if there are children under 18),
3. For each candidate service:
   - Applies rules from `config/rules.yaml` (EI base eligibility, `need_more_info`, voluntary quit; CCB eligibility, no children, etc.),
   - Uses `data/program_guides.json` to attach eligibility blurbs and required documents.

For CCB, when the profile indicates **single parent + children**, templates and explanations explicitly highlight the importance of child benefits for single-parent households.

### 7.3 Ticket priority & fairness signals

The ticket priority is computed using configuration in `config/priority_rules.yaml`. Conceptually, it adds points for factors such as:

- Imminent income loss (unemployed for reasons like layoff / end of contract),
- Presence of children (especially very young children),
- Being a single parent,
- Disability or accommodation needs,
- Residency uncertainty,
- Unresolved `need_more_info` outcomes.

The result is exposed as:

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

Weights and thresholds are explicit and can be tuned by policy teams without touching code.

### 7.4 Explanations & evidence packages

For each recommendation, FairRoute generates:

- Citizen-facing explanation – short, friendly text at around Grade-8 reading level, in the client’s preferred language,
- Staff-facing explanation – a more technical rationale indicating which rules fired and which act sections were referenced.

Each evaluation writes a proof package to `logs/proof_<case_id>.json` containing:

- `case_id` (returned as `proof_package_id`),
- The full `case_profile`,
- All recommendations including explanations, ticket priority and open-data references.

---

## 8. Example user journeys

### 8.1 Newly unemployed parent (multilingual)

- A parent who was laid off in Ontario writes their story (English, French or Chinese).
- FairRoute parses the narrative and pre-fills a case profile.
- The citizen answers clarifying questions (including “Are you a single parent?”).
- FairRoute recommends EI and CCB (where appropriate), with explanations and checklists.
- Ticket priority gives extra weight to single parenthood, young children, and disability/accommodation needs.

### 8.2 Staff reviewing a case

- A staff member opens the Staff view.
- They re-run the same steps 1 and 2 using the citizen’s text (or a recorded transcript).
- They inspect:
  - The structured `CaseProfile`,
  - Suggested services and rule outcomes,
  - Ticket priority (score, band, human-review flag, reasons),
  - Raw JSON and, if needed, stored proof packages via `/api/staff/case/{case_id}`.

---

## 9. Evaluation, limitations & future work

This MVP is not production-ready. It is intended as an illustrative prototype. Known limitations and possible extensions include:

- **Rule coverage** – currently focuses on EI Regular and CCB; future work could add sickness benefits, disability benefits, provincial programs, and more nuanced rule sets.
- **LLM reliability** – parsing and explanation quality depend on the LLM; future work could add validation/guardrails and automated test suites using `data/test_cases.json`.
- **Performance and scaling** – designed for small demo volume; future work could add caching, batching, and real queue integration.
- **Fairness evaluation** – `docs/fairness_evaluation.md` is a starting point; future work could run systematic audits by language, disability, single-parent status, and region.

Despite these limitations, FairRoute demonstrates a concrete pattern for combining LLMs with open data and explicit rules to support fair, explainable digital services.

---

## 10. Alignment with the G7 GovAI Grand Challenge

FairRoute is aligned with the challenge aims by:

- Demonstrating a practical use case that directly supports vulnerable residents (newly unemployed parents and, more broadly, families facing income loss),
- Combining generative AI with transparent rules and open data, not opaque end-to-end models,
- Surfacing fairness and accessibility features (multilingual support, disability and accommodation flags, single-parent priority),
- Providing an auditable trail (proof packages) to support accountability and oversight,
- Being designed as a reusable pattern that can be extended to other benefit domains and personas.

---

## 11. License & acknowledgments

This MVP uses:

- The OpenAI API for language understanding and explanation generation,
- Publicly available descriptions of Employment Insurance and the Canada Child Benefit, paraphrased for this prototype,
- The problem framing from the G7 GovAI Grand Challenge (Problem 4 – public-facing digital services).

If you adapt or extend FairRoute, please consider:

- Documenting the policy and legal sources you use,
- Sharing improvements to rules, evaluation scripts, or accessibility features.

(Choose an appropriate open-source license for this repository, e.g. MIT or Apache-2.0, and add it here.)

---

## 12. Ownership & copyright

**FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant** was created by  
**Fanmei Wang and Alexander YZ Fu (2025)**.

Unless otherwise noted, all source code and documentation in this repository is:

- Copyright (c) 2025 Fanmei Wang and Alexander YZ Fu.  
- All rights reserved.

