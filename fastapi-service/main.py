from fastapi import FastAPI
from routers.generate import router as generate_router
from routers.moderate import router as moderate_router
from routers.video import router as video_router

app = FastAPI()

# Include all routers
app.include_router(generate_router, prefix="/api")
app.include_router(moderate_router, prefix="/api")
app.include_router(video_router, prefix="/api")
