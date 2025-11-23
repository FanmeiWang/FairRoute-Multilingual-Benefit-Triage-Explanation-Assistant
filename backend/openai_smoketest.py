from openai import OpenAI

# ⚠️ 这里手动填你的真实 key，必须是以 "sk-" 开头的一整串
API_KEY = "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"

client = OpenAI(api_key=API_KEY)

print("Calling OpenAI /models...")
resp = client.models.list()

print("\n✅ Models from API:")
for m in resp.data:
    print(" -", m.id)