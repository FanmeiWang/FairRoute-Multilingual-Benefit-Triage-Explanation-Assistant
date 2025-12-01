from typing import Any, Dict
import json
import os

from dotenv import load_dotenv
from openai import OpenAI

from .models import CaseProfile, RawIntake

# Load .env so that OPENAI_API_KEY / OPENAI_MODEL_NAME go into os.environ
# This runs as soon as the module is imported by FastAPI.
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set")

# Create a single OpenAI client.
client = OpenAI(api_key=api_key)

# Read model name from env, default to gpt-4o-mini if not set
OPENAI_MODEL_NAME = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

async def parse_case_with_llm(intake: RawIntake) -> CaseProfile:
    """
    Use OpenAI Chat Completions to turn free text into a CaseProfile JSON.
    """

    system_prompt = """
You are an assistant that extracts a structured profile for benefit triage in Canada.
Return ONLY a JSON object matching this schema:

{
  "age": int or null,
  "province": string or null,       // two-letter code like "ON", "QC"
  "employment_status": string or null,     // unemployed, employed, self-employed, retired, unknown
  "unemployment_reason": string or null,   // layoff, end_of_contract, quit, fired_for_cause, other, unknown
  "children_count": int,
  "youngest_child_age": int or null,
  "is_single_parent": bool or null,
  "has_disability": bool,
  "needs_accommodation": bool,
  "preferred_language": "en" | "fr" | "zh" | "other",
  "insurable_hours_last_52_weeks": int or null,
  "residency_status": "canadian_resident" | "temporary_resident" | "unknown"
}

If information is not mentioned, use null or a sensible default (children_count = 0 if no children).
Detect language: if the text is mainly Chinese, set preferred_language="zh"; if French, "fr"; otherwise "en".
If the text clearly indicates they are a single parent caring for children alone (e.g. "single mom", "single dad", "single parent", "单亲妈妈", "单亲爸爸"), set is_single_parent=true.
If the text clearly indicates they live with a spouse/partner who shares care of the children, set is_single_parent=false.
If it is unclear, set is_single_parent=null.
Only output JSON, no extra text.
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": intake.text},
    ]

    resp = client.chat.completions.create(
        model=OPENAI_MODEL_NAME,
        messages=messages,
        temperature=0,
        response_format={"type": "json_object"},
    )

    content = resp.choices[0].message.content
    data: Dict[str, Any] = json.loads(content)

    return CaseProfile(**data)


def generate_explanation_with_llm(payload: Dict[str, Any]) -> str:
    """
    Use the LLM to turn rule templates + guidance into a plain-language explanation.
    同步版本：注意这里已经不是 async 了。
    """
    base_text = payload.get("base_text", "")
    extra_context = payload.get("extra_context", "")
    target_language = payload.get("target_language", "en")

    system_prompt = f"""
You are an assistant that explains Canadian benefit programs in clear {target_language.upper()}.
You will receive:
- base_text: a short template message about eligibility
- extra_context: an optional guidance snippet

Your task:
- Write a short explanation (max 4 sentences) at around Grade 8 reading level.
- Keep it simple and friendly.
- If base_text suggests uncertainty, make that clear.
- Do NOT give legal advice; just explain at a high level.
    """

    user_content = json.dumps(
        {
            "base_text": base_text,
            "extra_context": extra_context,
            "target_language": target_language,
        },
        ensure_ascii=False,
    )

    resp = client.chat.completions.create(
        model=OPENAI_MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
    )

    return resp.choices[0].message.content.strip()

