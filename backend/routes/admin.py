from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from config import ADMIN_SECRET_KEY
from database.connection import get_db
from database.models import pdf_doc
import pymupdf
import os

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
        if isinstance(s.get("language"), str):
            lang = s["language"].lower().strip()
            if lang in ["en", "en-in", "en-us"]:
                s["language"] = "english"
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
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")
    else:
        text = content_bytes.decode("utf-8", errors="ignore")

    if not text.strip():
        raise HTTPException(status_code=400, detail="File appears to be empty or unreadable")

    db = get_db()

    # ✅ Replace if filename already exists
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