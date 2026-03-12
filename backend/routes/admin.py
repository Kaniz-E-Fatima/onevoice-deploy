from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import JSONResponse
from config import ADMIN_SECRET_KEY
from database.connection import get_db
import os
import shutil

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

def verify_admin(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.get("/admin/sessions")
async def get_sessions(x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    cursor = db.chat_sessions.find().sort("updated_at", -1).limit(50)
    sessions = await cursor.to_list(length=50)
    for s in sessions:
        s["_id"] = str(s["_id"])
        # ✅ Normalize language field
        if isinstance(s.get("language"), str):
            lang = s["language"].lower().strip()
            if lang in ["en", "en-in", "en-us"]:
                s["language"] = "english"
        # ✅ Fix messages — ensure it's always a list of dicts
        messages = s.get("messages", [])
        clean_messages = []
        for m in messages:
            if isinstance(m, dict):
                clean_messages.append({
                    "role": str(m.get("role", "unknown")),
                    "content": str(m.get("content", "")),
                    "timestamp": str(m.get("timestamp", ""))
                })
        s["messages"] = clean_messages
    return sessions

# ✅ NEW: List all PDFs
@router.get("/admin/pdfs")
async def list_pdfs(x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    files = []
    if os.path.exists(DATA_DIR):
        for f in os.listdir(DATA_DIR):
            if f.endswith(".pdf") or f.endswith(".txt"):
                path = os.path.join(DATA_DIR, f)
                files.append({
                    "name": f,
                    "size": round(os.path.getsize(path) / 1024, 1),  # KB
                    "type": "pdf" if f.endswith(".pdf") else "txt",
                    "modified": os.path.getmtime(path)
                })
    files.sort(key=lambda x: x["modified"], reverse=True)
    return {"files": files}

# ✅ NEW: Upload PDF
@router.post("/admin/pdfs/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    x_admin_key: str = Header(None)
):
    verify_admin(x_admin_key)
    if not file.filename.endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files allowed")
    os.makedirs(DATA_DIR, exist_ok=True)
    file_path = os.path.join(DATA_DIR, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"message": f"✅ {file.filename} uploaded successfully", "filename": file.filename}

# ✅ NEW: Delete PDF
@router.delete("/admin/pdfs/{filename}")
async def delete_pdf(filename: str, x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(file_path)
    return {"message": f"🗑️ {filename} deleted successfully"}