from typing import List, Dict, Any

from .models import Service
from .llm_client import generate_explanation_with_llm


def build_staff_explanation(
    service: Service,
    fired_rules: List[Dict[str, Any]],
    guide: Dict[str, Any],
) -> str:
    parts: List[str] = [f"Service: {service.service_name_en} ({service.service_id})"]

    if fired_rules:
        for rule in fired_rules:
            parts.append(
                f"Rule {rule['rule_id']} from {rule['source_act']} {rule['section']} fired with outcome '{rule['outcome']}'."
            )
    else:
        parts.append("No specific rule fired; case requires human review.")

    if guide:
        parts.append("Guidance snippet available.")

    return " ".join(parts)


def build_client_explanation(
    service: Service,
    fired_rules: List[Dict[str, Any]],
    guide: Dict[str, Any],
    preferred_language: str,
) -> str:
    if fired_rules:
        base_text = fired_rules[0].get(
            f"explanation_template_{preferred_language}",
            fired_rules[0].get("explanation_template_en", ""),
        )
    else:
        base_text = "We are not certain about your eligibility based on the information provided."

    extra_context = guide.get("eligibility_text_en", "") if guide else ""

    payload = {
        "base_text": base_text,
        "extra_context": extra_context,
        "target_language": preferred_language,
    }

    # 这里同步调用，为简单起见
    # 你也可以把整个 pipeline 调成 async
    import asyncio
    return asyncio.run(generate_explanation_with_llm(payload))
