from fastapi import APIRouter
from ..rules_engine import load_rules

router = APIRouter()

@router.get("/admin/rules")
def list_rules():
    return load_rules()
