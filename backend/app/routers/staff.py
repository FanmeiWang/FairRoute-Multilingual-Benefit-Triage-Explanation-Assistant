from fastapi import APIRouter, HTTPException
from pathlib import Path
import json
from typing import Any, Dict

router = APIRouter()

LOG_DIR = Path(__file__).resolve().parents[2] / "logs"


@router.get("/staff/case/{case_id}")
def get_case(case_id: str) -> Dict[str, Any]:
    path = LOG_DIR / f"proof_{case_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Case not found")
    with path.open(encoding="utf-8") as f:
        return json.load(f)
