from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import ALLOWED_ORIGINS
from database.connection import connect_db, close_db
from routes.chat import router as chat_router
from routes.analytics import router as analytics_router
from routes.admin import router as admin_router
from routes.auth import router as auth_router  # ADD THIS
import asyncio
import httpx
import os
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import Request
from fastapi.responses import JSONResponse

# Simple in-memory rate limiter
request_counts = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/api/chat":
        ip = request.client.host
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        # Clean old requests
        request_counts[ip] = [t for t in request_counts[ip] if t > minute_ago]
        if len(request_counts[ip]) >= 20:  # 20 messages per minute
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait a moment."}
            )
        request_counts[ip].append(now)
    return await call_next(request)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    task = asyncio.create_task(keep_alive())
    yield
    task.cancel()
    await close_db()

async def keep_alive():
    await asyncio.sleep(60)
    while True:
        try:
            app_url = os.getenv("RENDER_EXTERNAL_URL", "")
            if app_url:
                async with httpx.AsyncClient() as client:
                    await client.get(f"{app_url}/health", timeout=10)
                    print("✅ Keep-alive ping sent")
        except Exception as e:
            print(f"Keep-alive ping failed: {e}")
        await asyncio.sleep(600)

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
app.include_router(auth_router, tags=["Auth"])  # ADD THIS

@app.get("/")
async def root():
    return {"message": "OneVoice API is running 🎙️"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/ping")
async def ping():
    return {"status": "awake", "message": "OneVoice is alive! 🎙️"}