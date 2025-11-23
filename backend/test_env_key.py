from dotenv import load_dotenv
import os
from openai import OpenAI

load_dotenv()
key = os.getenv("OPENAI_API_KEY")
print("KEY =", key)
client = OpenAI()
models = client.models.list()
print([m.id for m in models.data[:5]])
