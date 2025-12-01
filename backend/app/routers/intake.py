from __future__ import annotations

from pathlib import Path
from typing import List
from uuid import uuid4
import json

from fastapi import APIRouter

from ..models import (
    RawIntake,
    ParsedIntakeResponse,
    EvaluationRequest,
    EvaluationResponse,
    ServiceRecommendation,
)
from ..llm_client import parse_case_with_llm
from ..service_matcher import load_services, match_services
from ..rules_engine import (
    load_rules,
    load_program_guides,
    evaluate_service,
    compute_priority_score,   # 兼容旧代码；本文件里可以不用
    compute_ticket_priority,
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


# --------------------------------------------------------------------------
# /api/intake/parse
# --------------------------------------------------------------------------


@router.post("/intake/parse", response_model=ParsedIntakeResponse)
async def parse_intake(raw: RawIntake) -> ParsedIntakeResponse:
    """
    Step 1: LLM 把 free-text 解析成 CaseProfile，
    同时返回还需要追问哪些关键信息。
    """
    # raw 就是 {"text": "...", "language": "en"}
    profile = await parse_case_with_llm(raw)

    follow_up_questions: List[str] = []

    # 省份缺失 → 追问
    if not profile.province:
        follow_up_questions.append("In which province or territory do you live?")

    # 失业但不知道 insurable hours → 追问
    if (
        profile.employment_status == "unemployed"
        and profile.insurable_hours_last_52_weeks is None
    ):
        follow_up_questions.append(
            "Roughly how many insurable hours did you work in the last 52 weeks?"
        )

    # 没有任何 children 信息 → 追问
    if profile.children_count == 0:
        follow_up_questions.append(
            "Do you have any children under 18 living with you?"
        )

    # 有孩子，但不清楚是不是单亲 → 温和追问
    if (
        profile.children_count
        and profile.children_count > 0
        and profile.is_single_parent is None
    ):
        follow_up_questions.append(
            "Are you the only adult primarily caring for the children (a single parent)?"
        )

    return ParsedIntakeResponse(
        case_profile=profile,
        follow_up_questions=follow_up_questions,
    )


# --------------------------------------------------------------------------
# /api/intake/evaluate
# --------------------------------------------------------------------------


@router.post("/intake/evaluate", response_model=EvaluationResponse)
async def evaluate(req: EvaluationRequest) -> EvaluationResponse:
    """
    Step 2: 用 CaseProfile 匹配服务、跑规则，计算统一 ticket priority，
    再写一份 proof package 到 logs/ 目录。
    """
    profile = req.case_profile

    services = get_services()
    rules = get_rules()
    guides = get_guides()

    matched = match_services(profile, services)

    # 统一的 ticket-level priority（“ML 风格”打分器）
    ticket_priority = compute_ticket_priority(profile)
    priority_score = ticket_priority["score"]
    priority_reasons = ticket_priority["reasons"]

    recs: List[ServiceRecommendation] = []

    for s in matched:
        rule_cfg = rules.get(s.service_id)
        if not rule_cfg:
            # 没有对应规则就跳过
            continue

        result = evaluate_service(profile, s, rule_cfg, guides)
        guide = result.get("guide") or {}

        # 规则触发信息 & 对应法条 section
        fired = result.get("fired_rules") or []
        act_sections = [r.get("section") for r in fired if r.get("section")]

        recs.append(
            ServiceRecommendation(
                service_id=s.service_id,
                service_name=(
                    s.service_name_en
                    if profile.preferred_language == "en"
                    else s.service_name_fr
                ),
                eligibility_status=result["eligibility_status"],
                explanation_client=result.get("client_explanation", ""),
                explanation_staff=result.get("staff_explanation", ""),
                priority_score=priority_score,
                # 每个推荐都带同一个统一 ticket priority
                ticket_priority=ticket_priority,
                required_documents=guide.get("required_documents_en", []),
                open_data_sources={
                    "service_id": s.service_id,
                    "program_id": rule_cfg.program_group,
                    "act_sections": act_sections,
                    "priority_reasons": priority_reasons,
                },
            )
        )

    # 把“证据包”写成 JSON 文件，方便以后审计
    case_id = f"CASE-{uuid4()}"
    proof = {
        "case_id": case_id,
        "case_profile": profile.dict(),
        "recommendations": [r.dict() for r in recs],
        "ticket_priority": ticket_priority,
    }

    log_path = LOG_DIR / f"proof_{case_id}.json"
    with log_path.open("w", encoding="utf-8") as f:
        json.dump(proof, f, ensure_ascii=False, indent=2)

    return EvaluationResponse(
        case_profile=profile,
        recommendations=recs,
        proof_package_id=case_id,
        ticket_priority=ticket_priority,
    )
