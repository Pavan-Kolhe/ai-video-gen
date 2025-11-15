# services/hf_video.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

# Use the OLD endpoint – the only one that supports video models
API_URL = "https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b"

headers = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Accept": "video/mp4",
    "Content-Type": "application/json"
}

def generate_video(prompt: str):
    payload = {
        "inputs": prompt,
        "parameters": {
            "num_frames": 16,
            "fps": 8
        }
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=300)
    except Exception as e:
        return {"error": f"Request failed: {e}"}

    if response.status_code != 200:
        return {"error": response.text}

    return response.content  # mp4 bytes
