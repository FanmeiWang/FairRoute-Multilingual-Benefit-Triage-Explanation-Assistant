from app.config import settings
from openai import OpenAI

print("settings.openai_api_key =", settings.openai_api_key)

if not settings.openai_api_key:
    raise RuntimeError("OPENAI_API_KEY is not set in settings")

client = OpenAI(api_key=settings.openai_api_key)

try:
    models = client.models.list()
    print("✅ API call via settings succeeded. First few models:")
    print([m.id for m in models.data[:5]])
except Exception as e:
    print("❌ API call via settings FAILED:")
    print(repr(e))
