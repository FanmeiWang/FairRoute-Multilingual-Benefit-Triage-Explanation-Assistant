from fastapi import APIRouter
from uuid import uuid4
from pathlib import Path
import json
from typing import List

from ..models import RawIntake, ParsedIntakeResponse, EvaluationRequest, EvaluationResponse, ServiceRecommendation
from ..llm_client import parse_case_with_llm
from ..service_matcher import load_services, match_services
from ..rules_engine import (
    load_rules,
    load_program_guides,
    evaluate_service,
    compute_priority_score,
)

router = APIRouter()

LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

_services_cache = None
_rules_cache = None
_guides_cache = None


def get_services():
    global _services_cache
    if _services_cache is None:
        _services_cache = load_services()
    return _services_cache


def get_rules():
    global _rules_cache
    if _rules_cache is None:
        _rules_cache = load_rules()
    return _rules_cache


def get_guides():
    global _guides_cache
    if _guides_cache is None:
        _guides_cache = load_program_guides()
    return _guides_cache


@router.post("/intake/parse", response_model=ParsedIntakeResponse)
async def parse_intake(raw: RawIntake) -> ParsedIntakeResponse:
    profile = await parse_case_with_llm(raw)
    follow_up_questions: List[str] = []

    if not profile.province:
        follow_up_questions.append("In which province or territory do you live?")
    if profile.employment_status == "unemployed" and profile.insurable_hours_last_52_weeks is None:
        follow_up_questions.append("Roughly how many insurable hours did you work in the last 52 weeks?")
    if profile.children_count == 0:
        follow_up_questions.append("Do you have any children under 18 living with you?")

    # 如果有孩子，但还不清楚是否单亲，友好地问一句
    if profile.children_count and profile.children_count > 0 and profile.is_single_parent is None:
        follow_up_questions.append(
            "Are you the only adult primarily caring for the children (a single parent)?"
        )

    return ParsedIntakeResponse(case_profile=profile, follow_up_questions=follow_up_questions)


@router.post("/intake/evaluate", response_model=EvaluationResponse)
async def evaluate(req: EvaluationRequest) -> EvaluationResponse:
    profile = req.case_profile

    services = get_services()
    rules = get_rules()
    guides = get_guides()

    matched = match_services(profile, services)
    priority_score, priority_reasons = compute_priority_score(profile)

    recs: list[ServiceRecommendation] = []

    for s in matched:
        rule_cfg = rules.get(s.service_id)
        if not rule_cfg:
            continue
        result = evaluate_service(profile, s, rule_cfg, guides)
        guide = result["guide"] or {}

        recs.append(
            ServiceRecommendation(
                service_id=s.service_id,
                service_name=s.service_name_en if profile.preferred_language == "en" else s.service_name_fr,
                eligibility_status=result["eligibility_status"],
                explanation_client=result["client_explanation"],
                explanation_staff=result["staff_explanation"],
                priority_score=priority_score,
                required_documents=guide.get("required_documents_en", []),
                open_data_sources={
                    "service_id": s.service_id,
                    "program_id": rule_cfg.get("program_id"),
                    "act_sections": [r["section"] for r in result["fired_rules"]],
                    "priority_reasons": priority_reasons,
                },
            )
        )

    case_id = f"CASE-{uuid4()}"
    proof = {
        "case_id": case_id,
        "case_profile": profile.dict(),
        "recommendations": [r.dict() for r in recs],
    }
    log_path = LOG_DIR / f"proof_{case_id}.json"
    with log_path.open("w", encoding="utf-8") as f:
        json.dump(proof, f, ensure_ascii=False, indent=2)

    return EvaluationResponse(
        case_profile=profile,
        recommendations=recs,
        proof_package_id=case_id,
    )
