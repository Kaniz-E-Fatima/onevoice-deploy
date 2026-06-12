from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from config import ADMIN_SECRET_KEY
from database.connection import get_db
from database.models import pdf_doc
from services.sync_service import sync_data_folder
import pymupdf
import os
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter()
DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

def verify_admin(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

# ✅ Manual re-sync endpoint — rescans data/ folder and adds any new/changed files
@router.post("/admin/pdfs/sync")
async def sync_pdfs(x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    result = await sync_data_folder()
    return {
        "message": f"Sync complete: {result['synced']} new files added, {result['skipped']} already up-to-date, {result['failed']} failed.",
        **result
    }


@router.get("/admin/sessions")
async def get_sessions(x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    cursor = db.chat_sessions.find().sort("updated_at", -1).limit(50)
    sessions = await cursor.to_list(length=50)
    for s in sessions:
        s["_id"] = str(s["_id"])
        if isinstance(s.get("language"), str):
            lang = s["language"].lower().strip()
            if lang in ["en", "en-in", "en-us"]:
                s["language"] = "english"
        messages = s.get("messages", [])
        clean_messages = []
        for m in messages:
            if isinstance(m, dict):
                clean_msg = {
                    "role": str(m.get("role", "unknown")),
                    "content": str(m.get("content", "")),
                    "timestamp": str(m.get("timestamp", ""))
                }
                if "feedback" in m:
                    clean_msg["feedback"] = m["feedback"]
                clean_messages.append(clean_msg)
        s["messages"] = clean_messages
    return sessions

# ✅ List all PDFs from MongoDB
@router.get("/admin/pdfs")
async def list_pdfs(x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    cursor = db.knowledge_base.find(
        {}, {"filename": 1, "file_type": 1, "size_kb": 1, "uploaded_at": 1}
    ).sort("uploaded_at", -1)
    files = await cursor.to_list(length=100)
    for f in files:
        f["_id"] = str(f["_id"])
    return {"files": files}

# ✅ Upload PDF to MongoDB
@router.post("/admin/pdfs/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    x_admin_key: str = Header(None)
):
    verify_admin(x_admin_key)
    if not file.filename.endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files allowed")

    content_bytes = await file.read()
    size_kb = round(len(content_bytes) / 1024, 1)

    # Extract text content
    if file.filename.endswith(".pdf"):
        try:
            doc = pymupdf.open(stream=content_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            # ✅ If scanned image PDF, store filename as content instead of blocking
            if not text.strip():
                text = f"[Document: {file.filename}] This document is available in the knowledge base."
        except Exception as e:
            text = f"[Document: {file.filename}] This document is available in the knowledge base."
    else:
        text = content_bytes.decode("utf-8", errors="ignore")

    db = get_db()
    await db.knowledge_base.delete_many({"filename": file.filename})
    doc_data = pdf_doc(
        filename=file.filename,
        content=text,
        file_type="pdf" if file.filename.endswith(".pdf") else "txt",
        size_kb=size_kb
    )
    await db.knowledge_base.insert_one(doc_data)
    return {"message": f"{file.filename} uploaded successfully", "filename": file.filename}

# ✅ Delete PDF from MongoDB
@router.delete("/admin/pdfs/{filename}")
async def delete_pdf(filename: str, x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    result = await db.knowledge_base.delete_many({"filename": filename})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": f"{filename} deleted successfully"}


# ✅ Delete a session
@router.delete("/admin/sessions/{session_id}")
async def delete_session(session_id: str, x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    import bson
    result = await db.chat_sessions.delete_one({"_id": bson.ObjectId(session_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}


# ✅ Export all sessions as CSV
@router.get("/admin/export/csv")
async def export_csv(x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    sessions = await db.chat_sessions.find().sort("updated_at", -1).to_list(length=1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Session ID", "Language", "Messages", "Created At", "Last Active", "User Email"])
    for s in sessions:
        messages = s.get("messages", [])
        writer.writerow([
            str(s.get("session_id", "")),
            str(s.get("language", "english")),
            len(messages),
            str(s.get("created_at", "")),
            str(s.get("updated_at", "")),
            str(s.get("user_email", ""))
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=onevoice_sessions.csv"}
    )

@router.get("/admin/feedback")
async def get_feedback(x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    sessions = await db.chat_sessions.find({}).to_list(length=1000)
    
    total_feedback = 0
    thumbs_up = 0
    thumbs_down = 0
    
    for s in sessions:
        for msg in s.get("messages", []):
            if isinstance(msg, dict) and "feedback" in msg:
                total_feedback += 1
                if msg["feedback"] == "up":
                    thumbs_up += 1
                else:
                    thumbs_down += 1
    
    satisfaction = round((thumbs_up / total_feedback * 100)) if total_feedback > 0 else 0
    
    return {
        "total_feedback": total_feedback,
        "thumbs_up": thumbs_up,
        "thumbs_down": thumbs_down,
        "satisfaction_rate": satisfaction
    }