from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


# ===== Service model (used by service_matcher) =====


class Service(BaseModel):
    """
    Basic service metadata, loaded from services_demo.csv (or similar).
    """

    service_id: str
    service_name_en: str
    service_name_fr: str
    program_group: Optional[str] = None
    tags: List[str] = []

    class Config:
        extra = "allow"  # allow extra columns from CSV


# ===== Intake & profile models =====


class RawIntake(BaseModel):
    """
    Raw free-text intake from a resident.
    """

    text: str
    language: str = "en"


class CaseProfile(BaseModel):
    """
    Structured case profile extracted by the LLM.
    This schema must match what /api/intake/parse returns.
    """

    age: Optional[int] = None
    province: Optional[str] = None  # "ON", "QC", ...

    # unemployed, employed, self-employed, retired, unknown
    employment_status: Optional[str] = None
    # layoff, end_of_contract, quit, fired_for_cause, other, unknown
    unemployment_reason: Optional[str] = None

    children_count: int = 0
    youngest_child_age: Optional[int] = None
    is_single_parent: Optional[bool] = None

    has_disability: bool = False
    needs_accommodation: bool = False

    preferred_language: Literal["en", "fr", "zh", "other"] = "en"

    insurable_hours_last_52_weeks: Optional[int] = None

    # 扩大的 residency_status 取值，与你前端的选项对齐
    residency_status: Literal[
        "canadian_resident",
        "permanent_resident",
        "temporary_resident",
        "refugee_claimant",
        "other",
        "unknown",
    ] = "unknown"


class ParsedIntakeResponse(BaseModel):
    """
    Response from /api/intake/parse.
    """

    case_profile: CaseProfile
    follow_up_questions: List[str] = []


class EvaluationRequest(BaseModel):
    """
    Request body for /api/intake/evaluate.
    """

    case_profile: CaseProfile


# ===== Rules & program guides (used by rules_engine) =====


class RuleConfig(BaseModel):
    id: str
    condition: str
    outcome: Literal["eligible", "not_eligible", "need_more_info"]
    explanation_template_en: Optional[str] = None
    explanation_template_fr: Optional[str] = None
    section: Optional[str] = None  # e.g. "Income Tax Act s.122.61"


class ServiceConfig(BaseModel):
    id: str
    name_en: str
    name_fr: str
    program_group: Optional[str] = None
    tags: List[str] = []
    rules: List[RuleConfig]


class ProgramGuide(BaseModel):
    service_id: str
    title_en: Optional[str] = None
    title_fr: Optional[str] = None
    summary_en: Optional[str] = None
    summary_fr: Optional[str] = None
    required_documents_en: List[str] = []


# ===== Ticket priority models =====


class TicketPriority(BaseModel):
    """
    Unified ticket priority output.
    """

    score: float
    band: Literal["high", "medium", "low"]
    requires_human_review: bool
    reasons: List[str] = []


# ===== Recommendation & evaluation models =====


class ServiceRecommendation(BaseModel):
    """
    Recommendation for a single service/program.
    """

    service_id: str
    service_name: str
    # eligible / not_eligible / need_more_info / unknown
    eligibility_status: str

    explanation_client: str
    explanation_staff: str

    # Legacy flat score (kept for backwards compatibility)
    priority_score: float

    # New structured ticket priority information
    ticket_priority: TicketPriority

    required_documents: List[str] = []
    open_data_sources: Dict[str, Any] = {}


class EvaluationResponse(BaseModel):
    """
    Response from /api/intake/evaluate.
    """

    case_profile: CaseProfile
    recommendations: List[ServiceRecommendation]
    proof_package_id: str

    # Unified ticket-level priority for this case.
    ticket_priority: TicketPriority
