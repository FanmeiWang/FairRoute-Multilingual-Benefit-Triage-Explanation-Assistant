import csv
from pathlib import Path
from typing import List

from .models import Service, CaseProfile

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def load_services() -> List[Service]:
    services: List[Service] = []
    path = DATA_DIR / "services_demo.csv"
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            services.append(
                Service(
                    service_id=row["service_id"],
                    service_name_en=row["service_name_en"],
                    service_name_fr=row["service_name_fr"],
                    service_description_en=row["service_description_en"],
                    service_description_fr=row["service_description_fr"],
                    service_scope=row["service_scope"],
                    service_type=row["service_type"],
                    keywords=[k.strip() for k in row["keywords"].split(",") if k.strip()],
                    organization_en=row["organization_en"],
                    online_availability=row["online_availability"],
                    website_url_en=row["website_url_en"],
                )
            )
    return services


def match_services(profile: CaseProfile, all_services: List[Service]) -> List[Service]:
    """
    简单初版：只要失业就建议 EI，只要有孩子就建议 CCB。
    以后可以用 embedding / BERT 做更精细的匹配。
    """
    candidates: List[Service] = []

    for s in all_services:
        if s.service_id == "EI_REGULAR":
            if profile.employment_status == "unemployed":
                candidates.append(s)
        elif s.service_id == "CCB":
            if profile.children_count and profile.children_count > 0:
                candidates.append(s)

    return candidates
