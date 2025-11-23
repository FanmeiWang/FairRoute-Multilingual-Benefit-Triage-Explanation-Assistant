from pathlib import Path
from typing import List, Dict, Any, Tuple
import yaml
import json

from .models import CaseProfile, Service
from .explanation import build_staff_explanation, build_client_explanation

# Project root / config + /data
CONFIG_DIR = Path(__file__).resolve().parents[2] / "config"
DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def load_rules() -> Dict[str, Any]:
    """
    Load rules from config/rules.yaml.

    It supports two formats:

    1) services is a list:
       services:
         - id: EI
           ...
         - id: CCB
           ...

    2) services is a dict:
       services:
         EI:
           ...
         CCB:
           ...
    """
    path = CONFIG_DIR / "rules.yaml"
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    raw_services = data.get("services")

    # 如果根本没有 "services" 字段，返回空 dict，避免后面再报错
    if raw_services is None:
        return {}

    # 情况 1：已经是 dict（id -> service 配置），直接返回
    if isinstance(raw_services, dict):
        return raw_services

    # 情况 2：是 list，就按原来的逻辑通过 id 转成 dict
    if isinstance(raw_services, list):
        return {svc["id"]: svc for svc in raw_services}

    # 其他奇怪情况（比如字符串），安全起见也返回空 dict，避免 AttributeError
    return {}


def load_program_guides() -> Dict[str, Any]:
    """
    Load additional human-written guidance text from data/program_guides.json.
    Keys are service IDs, values are small dicts with extra info for staff + clients.
    """
    path = DATA_DIR / "program_guides.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_priority_config() -> Dict[str, Any]:
    """
    Load priority scoring config from config/priority_rules.yaml.

    期望结构大致是：

    weights:
      base: 0.2
      imminent_income_loss: 0.4
      has_children: 0.2
      is_single_parent: 0.1
      has_disability_or_accommodation: 0.2
      high_unemployment_province: 0.1

    high_unemployment_provinces:
      - NL
      - PE
      - NB
      - NS
    """
    path = CONFIG_DIR / "priority_rules.yaml"
    with path.open(encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    # 空文件的情况
    if raw is None:
        return {}

    # 正常：已经是 dict
    if isinstance(raw, dict):
        return raw

    # 如果写成 JSON 字符串之类的，尝试再解析一次
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    # 其他奇怪格式，就用空配置，避免 AttributeError
    return {}



def evaluate_service(
    profile: CaseProfile,
    service: Service,
    rules_for_service: Dict[str, Any],
    guides: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Evaluate a single service against a CaseProfile.

    - Walk through rule list for this service
    - First rule whose 'condition' evals to True "fires"
    - That rule's 'outcome' becomes the eligibility_status
    - Build staff + client explanations based on fired rules + guidance
    """
    fired_rules: List[Dict[str, Any]] = []
    eligibility_status = "need_more_info"

    # context for eval() – we expose the profile fields as variables
    ctx = profile.dict()

    for rule in rules_for_service.get("rules", []):
        condition = rule.get("condition") or ""
        try:
            if condition and eval(condition, {}, ctx):  # demo only – prod should use safe parser
                # Copy rule so we can tweak explanation templates without mutating config
                matched_rule = dict(rule)

                # Special case: CCB + single parent -> append extra explanation sentence
                if (
                    service.service_id == "CCB"
                    and profile.children_count
                    and profile.children_count > 0
                    and profile.is_single_parent
                ):
                    extra_en = (
                        " As a single parent, you are the main caregiver, so this "
                        "benefit can be especially important for your family."
                    )
                    extra_fr = (
                        " En tant que parent seul, vous êtes le principal fournisseur de soins; "
                        "cette prestation peut donc être particulièrement importante pour votre famille."
                    )
                    base_en = matched_rule.get("explanation_template_en") or ""
                    base_fr = matched_rule.get("explanation_template_fr") or ""
                    matched_rule["explanation_template_en"] = (base_en + extra_en).strip()
                    matched_rule["explanation_template_fr"] = (base_fr + extra_fr).strip()

                fired_rules.append(matched_rule)
                eligibility_status = matched_rule.get("outcome", "need_more_info")
                break
        except Exception:
            # If a bad condition expression explodes, we just skip that rule.
            continue

    guide = guides.get(service.service_id, {})

    staff_expl = build_staff_explanation(service, fired_rules, guide)
    preferred_language = profile.preferred_language
    client_expl = build_client_explanation(
        service, fired_rules, guide, preferred_language
    )

    return {
        "service_id": service.service_id,
        "eligibility_status": eligibility_status,
        "fired_rules": fired_rules,
        "staff_explanation": staff_expl,
        "client_explanation": client_expl,
        "guide": guide,
    }


def compute_priority_score(profile: CaseProfile) -> Tuple[float, List[str]]:
    """
    Compute a simple priority score (0–1) plus human-readable reasons
    based on priority_rules.yaml config.
    """
    cfg = load_priority_config()
    w = cfg.get("weights", {})

    reasons: List[str] = []
    score = w.get("base", 0.2)

    # Imminent job / income loss
    if profile.employment_status == "unemployed":
        score += w.get("imminent_income_loss", 0.4)
        reasons.append("Imminent income loss")

    # Caring for children
    if profile.children_count and profile.children_count > 0:
        score += w.get("has_children", 0.2)
        reasons.append("Caring for children")

    # Single parent caring for children – extra weight
    if profile.children_count and profile.children_count > 0 and profile.is_single_parent:
        score += w.get("is_single_parent", 0.0)
        reasons.append("Single parent caring for children")

    # Disability or accommodation need
    if profile.has_disability or profile.needs_accommodation:
        score += w.get("has_disability_or_accommodation", 0.2)
        reasons.append("Disability or communication barrier")

    # Province-level unemployment
    high_unemp_provs = cfg.get("high_unemployment_provinces", []) or []
    if profile.province and profile.province in high_unemp_provs:
        score += w.get("high_unemployment_province", 0.1)
        reasons.append("Higher unemployment in province")

    return min(score, 1.0), reasons
