# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load .env variables
load_dotenv()

# Import routers
from routers.generate import router as generate_router
from routers.moderate import router as moderate_router
from routers.video import router as video_router

app = FastAPI(title="AI Video Generator Backend", version="1.0")

# Allow calls from your Next.js frontend (localhost or deployed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "running", "message": "AI Video Gen FastAPI backend online"}

# Register routes
app.include_router(generate_router, prefix="/generate", tags=["Generation"])
app.include_router(moderate_router, prefix="/moderate", tags=["Moderation"])
app.include_router(video_router, prefix="/video", tags=["Video Files"])
