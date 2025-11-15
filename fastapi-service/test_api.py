import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

models = genai.list_models()

for m in models:
    print("\nMODEL:", m.name)
    print("METHODS:", m.supported_generation_methods)
