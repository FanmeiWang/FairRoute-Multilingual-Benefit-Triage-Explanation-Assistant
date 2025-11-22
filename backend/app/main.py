from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import intake, staff, admin


app = FastAPI(
    title="FairRoute: Multilingual Benefit Triage, Routing & Explanation Assistant - Backend"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo 阶段可以 *，生产要收紧
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intake.router, prefix="/api", tags=["intake"])
app.include_router(staff.router, prefix="/api", tags=["staff"])
app.include_router(admin.router, prefix="/api", tags=["admin"])


@app.get("/health")
def health():
    return {"status": "ok"}
