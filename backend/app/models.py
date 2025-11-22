from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class CaseProfile(BaseModel):
    age: Optional[int] = Field(None, ge=16, le=80)
    province: Optional[str] = None
    employment_status: Optional[str] = None  # unemployed, employed, self-employed, retired, unknown
    unemployment_reason: Optional[str] = None  # layoff, end_of_contract, quit, fired_for_cause, other, unknown
    children_count: int = 0
    youngest_child_age: Optional[int] = Field(None, ge=0, le=17)
    is_single_parent: Optional[bool] = None  # single parent caring for children alone
    has_disability: bool = False
    needs_accommodation: bool = False
    preferred_language: str = "en"  # en, fr, zh, other
    insurable_hours_last_52_weeks: Optional[int] = Field(None, ge=0)
    residency_status: Optional[str] = "unknown"  # canadian_resident, temporary_resident, unknown


class RawIntake(BaseModel):
    text: str
    language: Optional[str] = None  # auto-detect if None


class ParsedIntakeResponse(BaseModel):
    case_profile: CaseProfile
    follow_up_questions: List[str] = []


class Service(BaseModel):
    service_id: str
    service_name_en: str
    service_name_fr: str
    service_description_en: str
    service_description_fr: str
    service_scope: str
    service_type: str
    keywords: List[str]
    organization_en: str
    online_availability: str
    website_url_en: str


class ServiceRecommendation(BaseModel):
    service_id: str
    service_name: str
    eligibility_status: str
    explanation_client: str
    explanation_staff: str
    priority_score: float
    required_documents: List[str] = []
    open_data_sources: Dict[str, Any] = {}


class EvaluationRequest(BaseModel):
    case_profile: CaseProfile


class EvaluationResponse(BaseModel):
    case_profile: CaseProfile
    recommendations: List[ServiceRecommendation]
proof_package_id: str
