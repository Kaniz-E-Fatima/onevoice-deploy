from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from config import ADMIN_SECRET_KEY, GROQ_API_KEY
from database.connection import get_db
from database.models import pdf_doc
from services.sync_service import sync_data_folder
import pymupdf
import os
import csv
import io
import base64
from groq import Groq
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

# ✅ Upload Document (PDF, TXT, Images) to MongoDB
@router.post("/admin/pdfs/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    x_admin_key: str = Header(None)
):
    verify_admin(x_admin_key)
    filename_lower = file.filename.lower()
    allowed_extensions = (".pdf", ".txt", ".png", ".jpg", ".jpeg")
    
    if not filename_lower.endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, PNG, JPG, JPEG files allowed")

    content_bytes = await file.read()
    size_kb = round(len(content_bytes) / 1024, 1)

    # Extract text content based on file type
    if filename_lower.endswith(".pdf"):
        try:
            doc = pymupdf.open(stream=content_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            if not text.strip():
                text = f"[Document: {file.filename}] This document is available in the knowledge base."
        except Exception as e:
            text = f"[Document: {file.filename}] This document is available in the knowledge base."
    elif filename_lower.endswith((".png", ".jpg", ".jpeg")):
        try:
            # Use Groq Vision model for OCR
            client = Groq(api_key=GROQ_API_KEY)
            mime_type = "image/png" if filename_lower.endswith(".png") else "image/jpeg"
            base64_image = base64.b64encode(content_bytes).decode("utf-8")
            response = client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all the text from this image exactly as it is. Output ONLY the extracted text with no other commentary. If there is no text, just output nothing."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                temperature=0.1
            )
            text = response.choices[0].message.content.strip()
            if not text:
                text = f"[Image: {file.filename}] Image uploaded but no text could be extracted."
        except Exception as e:
            print(f"Vision OCR Error: {e}")
            text = f"[Image: {file.filename}] Image uploaded but OCR failed."
    else:
        text = content_bytes.decode("utf-8", errors="ignore")

    db = get_db()
    await db.knowledge_base.delete_many({"filename": file.filename})
    
    # Determine basic file_type string for the DB record
    file_type = "pdf"
    if filename_lower.endswith(".txt"): file_type = "txt"
    elif filename_lower.endswith((".png", ".jpg", ".jpeg")): file_type = "image"

    doc_data = pdf_doc(
        filename=file.filename,
        content=text,
        file_type=file_type,
        size_kb=size_kb
    )
    await db.knowledge_base.insert_one(doc_data)

    # Also store raw bytes so the download endpoint can serve the file from MongoDB
    if file_type in ("pdf", "image"):
        await db.pdf_files.delete_many({"filename": file.filename})
        await db.pdf_files.insert_one({
            "filename": file.filename,
            "data": content_bytes,
            "size_kb": size_kb,
            "file_type": file_type,
            "uploaded_at": __import__('datetime').datetime.utcnow()
        })

    return {"message": f"{file.filename} uploaded successfully", "filename": file.filename}

# ✅ Delete PDF from MongoDB
@router.delete("/admin/pdfs/{filename}")
async def delete_pdf(filename: str, x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    result = await db.knowledge_base.delete_many({"filename": filename})
    await db.pdf_files.delete_many({"filename": filename})  # also remove binary
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


# ── Public PDF download endpoint (no auth required) ────────────────────────────
from fastapi import Path as FPath
from fastapi.responses import FileResponse
import urllib.parse

@router.get("/pdfs/download/{filename:path}")
async def download_pdf(filename: str):
    """Serve a PDF from MongoDB pdf_files collection. Works on Render (no local disk needed)."""
    try:
        decoded_name = urllib.parse.unquote(filename)
        safe_name = os.path.basename(decoded_name)

        # Build RFC 5987 Content-Disposition so special chars (quotes, parens, etc.) are safe
        encoded_name = urllib.parse.quote(safe_name, safe="")
        content_disposition = f"inline; filename*=UTF-8''{encoded_name}"

        media_type = "application/pdf" if safe_name.lower().endswith(".pdf") else "text/plain"

        db = get_db()
        record = await db.pdf_files.find_one({"filename": safe_name})

        if record and record.get("data"):
            pdf_bytes = bytes(record["data"])
            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type=media_type,
                headers={
                    "Content-Disposition": content_disposition,
                    "Content-Length": str(len(pdf_bytes))
                }
            )

        # Fallback: try local disk (for local dev where disk is available)
        local_path = os.path.join(DATA_DIR, safe_name)
        if os.path.exists(local_path):
            return FileResponse(
                path=local_path,
                media_type=media_type,
                headers={"Content-Disposition": content_disposition}
            )

        raise HTTPException(status_code=404, detail=f"File '{safe_name}' not found. Try re-syncing via /admin/pdfs/sync")

    except HTTPException:
        raise
    except Exception as e:
        print(f"PDF download error for '{filename}': {e}")
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")