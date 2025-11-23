# backend/app/config.py

import os
from dotenv import load_dotenv
from pydantic import BaseModel

# 显式加载 backend/.env
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # .../backend/app -> .../backend
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

class Settings(BaseModel):
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_model_name: str = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

settings = Settings()

