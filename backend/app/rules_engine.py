from pathlib import Path
from typing import List, Dict, Any, Tuple
import yaml
import json

from .models import CaseProfile, Service
from .explanation import build_staff_explanation, build_client_explanation

CONFIG_DIR = Path(__file__).resolve().parents[2] / "config"
DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def load_rules() -> Dict[str, Any]:
    path = CONFIG_DIR / "rules.yaml"
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return {svc["id"]: svc for svc in data["services"]}


def load_program_guides() -> Dict[str, Any]:
    path = DATA_DIR / "program_guides.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_priority_config() -> Dict[str, Any]:
    path = CONFIG_DIR / "priority_rules.yaml"
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def evaluate_service(
    profile: CaseProfile,
    service: Service,
    rules_for_service: Dict[str, Any],
    guides: Dict[str, Any],
) -> Dict[str, Any]:
    fired_rules: List[Dict[str, Any]] = []
    eligibility_status = "need_more_info"

    ctx = profile.dict()

    for rule in rules_for_service.get("rules", []):
        condition = rule["condition"]
        try:
            if eval(condition, {}, ctx):  # 注意：demo 用 eval，生产要换安全解析
                # 拷贝一份 rule，避免修改原始配置
                matched_rule = dict(rule)

                # 如果是 CCB 且是单亲家长，在模板上额外拼一句说明（只影响当前解释）
                if (
                    service.service_id == "CCB"
                    and profile.children_count
                    and profile.children_count > 0
                    and profile.is_single_parent
                ):
                    extra_en = " As a single parent, you are the main caregiver, so this benefit can be especially important for your family."
                    extra_fr = " En tant que parent seul, vous êtes le principal fournisseur de soins; cette prestation peut donc être particulièrement importante pour votre famille."
                    base_en = matched_rule.get("explanation_template_en") or ""
                    base_fr = matched_rule.get("explanation_template_fr") or ""
                    matched_rule["explanation_template_en"] = (base_en + extra_en).strip()
                    matched_rule["explanation_template_fr"] = (base_fr + extra_fr).strip()

                fired_rules.append(matched_rule)
                eligibility_status = matched_rule["outcome"]
                break
        except Exception:
            continue

    guide = guides.get(service.service_id, {})
    staff_expl = build_staff_explanation(service, fired_rules, guide)
    # 注意：build_client_explanation 还是按照原来的接口，只是多了上面那段单亲说明在模板里
    preferred_language = profile.preferred_language
    client_expl = build_client_explanation(service, fired_rules, guide, preferred_language)

    return {
        "service_id": service.service_id,
        "eligibility_status": eligibility_status,
        "fired_rules": fired_rules,
        "staff_explanation": staff_expl,
        "client_explanation": client_expl,
        "guide": guide,
    }


def compute_priority_score(profile: CaseProfile) -> Tuple[float, List[str]]:
    cfg = load_priority_config()
    w = cfg["weights"]
    reasons: List[str] = []
    score = w.get("base", 0.2)

    if profile.employment_status == "unemployed":
        score += w.get("imminent_income_loss", 0.4)
        reasons.append("Imminent income loss")

    if profile.children_count and profile.children_count > 0:
        score += w.get("has_children", 0.2)
        reasons.append("Caring for children")

    # 单亲 + 有孩子：额外加权
    if profile.children_count and profile.children_count > 0 and profile.is_single_parent:
        score += w.get("is_single_parent", 0.0)
        reasons.append("Single parent caring for children")

    if profile.has_disability or profile.needs_accommodation:
        score += w.get("has_disability_or_accommodation", 0.2)
        reasons.append("Disability or communication barrier")

    if profile.province and profile.province in cfg.get("high_unemployment_provinces", []):
        score += w.get("high_unemployment_province", 0.1)
        reasons.append("Higher unemployment in province")

    return min(score, 1.0), reasons
