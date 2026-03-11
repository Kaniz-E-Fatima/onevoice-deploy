from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import ALLOWED_ORIGINS
from database.connection import connect_db, close_db
from routes.chat import router as chat_router
from routes.analytics import router as analytics_router
from routes.admin import router as admin_router
import asyncio
import httpx
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    # Start keep-alive task
    task = asyncio.create_task(keep_alive())
    yield
    task.cancel()
    await close_db()

async def keep_alive():
    """Ping self every 10 minutes to prevent Render from sleeping."""
    await asyncio.sleep(60)  # Wait 1 min after startup
    while True:
        try:
            app_url = os.getenv("RENDER_EXTERNAL_URL", "")
            if app_url:
                async with httpx.AsyncClient() as client:
                    await client.get(f"{app_url}/health", timeout=10)
                    print("✅ Keep-alive ping sent")
        except Exception as e:
            print(f"Keep-alive ping failed: {e}")
        await asyncio.sleep(600)  # Every 10 minutes

app = FastAPI(title="OneVoice Chatbot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])
app.include_router(admin_router, prefix="/api", tags=["Admin"])

@app.get("/")
async def root():
    return {"message": "OneVoice API is running 🎙️"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/ping")
async def ping():
    return {"status": "awake", "message": "OneVoice is alive! 🎙️"}
