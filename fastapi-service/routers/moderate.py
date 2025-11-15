# routers/moderate.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.moderation import moderate_prompt  # should return (bool, list)

router = APIRouter()

class ModerationBody(BaseModel):
    prompt: str

@router.post("/")
def moderate(body: ModerationBody):
    """
    Run moderation on the prompt.
    Expect moderation.moderate_prompt(prompt) -> (allowed: bool, reasons: list)
    """
    try:
        allowed, reasons = moderate_prompt(body.prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"safe": allowed, "reasons": reasons}
