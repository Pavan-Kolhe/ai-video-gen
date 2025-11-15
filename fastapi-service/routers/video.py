# routers/video.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter()

# directory where generated videos can be saved (create this folder)
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/status")
def status():
    return {"status": "video router up"}

@router.get("/file/{filename}")
def get_video_file(filename: str):
    """
    Serve a saved video from the assets/ folder:
    GET /generate/file/myvideo.mp4
    """
    requested = ASSETS_DIR / filename
    if not requested.exists() or not requested.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(path=str(requested), media_type="video/mp4", filename=filename)
