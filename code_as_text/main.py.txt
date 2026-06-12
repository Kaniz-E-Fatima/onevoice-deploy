from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from config import ALLOWED_ORIGINS
from database.connection import connect_db, close_db
from routes.chat import router as chat_router
from routes.analytics import router as analytics_router
from routes.admin import router as admin_router
from routes.auth import router as auth_router
from services.sync_service import sync_data_folder
import asyncio
import httpx
import os
from collections import defaultdict
from datetime import datetime, timedelta

# ✅ Rate limiter storage
request_counts = defaultdict(list)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    # ✅ Auto-sync data/ folder → MongoDB on every startup
    try:
        result = await sync_data_folder()
        print(f"📂 Startup sync: {result['synced']} new, {result['skipped']} unchanged, {result['failed']} failed")
    except Exception as e:
        print(f"⚠️  Startup sync error: {e}")
    # ✅ Start background tasks: keep-alive ping + periodic folder watcher
    task_keepalive = asyncio.create_task(keep_alive())
    task_watcher = asyncio.create_task(periodic_sync())
    yield
    task_keepalive.cancel()
    task_watcher.cancel()
    await close_db()

async def periodic_sync():
    """Re-scan the data/ folder every 2 minutes and sync any new files to MongoDB."""
    await asyncio.sleep(120)  # wait 2 mins before first poll (startup sync already ran)
    while True:
        try:
            result = await sync_data_folder()
            if result['synced'] > 0:
                print(f"📂 Periodic sync: {result['synced']} new files added to knowledge base")
        except Exception as e:
            print(f"⚠️  Periodic sync error: {e}")
        await asyncio.sleep(120)  # repeat every 2 minutes

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

# ✅ app must be defined BEFORE middleware
app = FastAPI(title="OneVoice Chatbot API", lifespan=lifespan)

# ✅ Rate limiting middleware AFTER app is defined
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/api/chat":
        ip = request.client.host
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        request_counts[ip] = [t for t in request_counts[ip] if t > minute_ago]
        if len(request_counts[ip]) >= 20:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait a moment."}
            )
        request_counts[ip].append(now)
    return await call_next(request)

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
app.include_router(auth_router, tags=["Auth"])

@app.get("/")
async def root():
    return {"message": "OneVoice API is running 🎙️"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/ping")
async def ping():
    return {"status": "awake", "message": "OneVoice is alive! 🎙️"}