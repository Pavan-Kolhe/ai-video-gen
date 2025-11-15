from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from services.hf_video import generate_video

router = APIRouter()

class PromptBody(BaseModel):
    prompt: str

@router.post("/video")
def generate_video_endpoint(body: PromptBody):
    result = generate_video(body.prompt)

    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])

    return Response(content=result, media_type="video/mp4")
