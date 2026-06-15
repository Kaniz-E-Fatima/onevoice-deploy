"""
sync_service.py — Automatically syncs all files in the data/ folder → MongoDB knowledge_base.
Called on backend startup AND via the /admin/pdfs/sync endpoint.
"""

import os
import base64
import pymupdf
from datetime import datetime
from database.connection import get_db
from database.models import pdf_doc
from config import GROQ_API_KEY
from groq import Groq

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")
SUPPORTED_EXTENSIONS = (".pdf", ".txt", ".jpg", ".jpeg", ".png")
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png")


def _extract_text_from_image(filepath: str, filename: str) -> str:
    """Use Groq Vision to OCR text from an image file."""
    try:
        with open(filepath, "rb") as f:
            raw_bytes = f.read()
        ext = filename.lower().rsplit(".", 1)[-1]
        mime = "image/png" if ext == "png" else "image/jpeg"
        b64 = base64.b64encode(raw_bytes).decode("utf-8")
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all the text from this image exactly as it appears. Output ONLY the extracted text, no commentary. If there is no text, output nothing."},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
                ]
            }],
            temperature=0.1
        )
        text = response.choices[0].message.content.strip()
        return text if text else f"[Image: {filename}] No text could be extracted."
    except Exception as e:
        print(f"  ⚠️  OCR failed for {filename}: {e}")
        return f"[Image: {filename}] OCR failed."


def _extract_text(filepath: str, filename: str) -> str:
    """Extract plain text from a PDF, TXT, or image file."""
    fname_lower = filename.lower()
    if fname_lower.endswith(".pdf"):
        try:
            doc = pymupdf.open(filepath)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            if not text.strip():
                return f"[Document: {filename}] This document is available in the knowledge base."
            return text
        except Exception as e:
            print(f"  ⚠️  Could not parse {filename}: {e}")
            return f"[Document: {filename}] This document is available in the knowledge base."
    elif fname_lower.endswith(IMAGE_EXTENSIONS):
        return _extract_text_from_image(filepath, filename)
    else:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            print(f"  ⚠️  Could not read {filename}: {e}")
            return ""


def _read_bytes(filepath: str) -> bytes:
    """Read raw file bytes for binary storage."""
    try:
        with open(filepath, "rb") as f:
            return f.read()
    except Exception:
        return b""


async def sync_data_folder() -> dict:
    """
    Scan the data/ directory and upsert every supported file into MongoDB.
    Returns a summary dict: {synced, skipped, failed, total}.
    """
    db = get_db()
    if db is None:
        return {"synced": 0, "skipped": 0, "failed": 0, "total": 0, "error": "DB not connected"}

    if not os.path.exists(DATA_DIR):
        return {"synced": 0, "skipped": 0, "failed": 0, "total": 0, "error": "data/ folder not found"}

    files = [
        f for f in os.listdir(DATA_DIR)
        if f.lower().endswith(SUPPORTED_EXTENSIONS)
        and not f.startswith(".")
        and f != "evaluation_questions.json"
    ]

    synced = 0
    skipped = 0
    failed = 0
    failed_files = []

    print(f"\n🔄 Auto-sync: Found {len(files)} files in data/ folder")

    for filename in files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            # Check if file is already in DB and hasn't changed size
            size_kb = round(os.path.getsize(filepath) / 1024, 1)
            existing = await db.knowledge_base.find_one(
                {"filename": filename, "size_kb": size_kb},
                {"_id": 1}
            )
            if existing:
                # Also ensure binary is stored even if text was already synced
                if filename.lower().endswith((".pdf",) + IMAGE_EXTENSIONS):
                    binary_exists = await db.pdf_files.find_one({"filename": filename}, {"_id": 1})
                    if not binary_exists:
                        raw_bytes = _read_bytes(filepath)
                        if raw_bytes:
                            await db.pdf_files.insert_one({
                                "filename": filename,
                                "data": raw_bytes,
                                "size_kb": size_kb,
                                "uploaded_at": datetime.utcnow()
                            })
                skipped += 1
                continue

            # Extract text
            text = _extract_text(filepath, filename)
            if not text:
                failed += 1
                continue

            fname_lower = filename.lower()
            if fname_lower.endswith(".pdf"):
                file_type = "pdf"
            elif fname_lower.endswith(IMAGE_EXTENSIONS):
                file_type = "image"
            else:
                file_type = "txt"
            doc_data = pdf_doc(
                filename=filename,
                content=text,
                file_type=file_type,
                size_kb=size_kb
            )

            # Upsert: replace old entry if filename exists but size changed
            await db.knowledge_base.delete_many({"filename": filename})
            await db.knowledge_base.insert_one(doc_data)

            # Also store raw bytes in pdf_files collection (for download endpoint)
            if filename.lower().endswith((".pdf",) + IMAGE_EXTENSIONS):
                raw_bytes = _read_bytes(filepath)
                if raw_bytes:
                    await db.pdf_files.delete_many({"filename": filename})
                    await db.pdf_files.insert_one({
                        "filename": filename,
                        "data": raw_bytes,
                        "size_kb": size_kb,
                        "file_type": file_type,
                        "uploaded_at": datetime.utcnow()
                    })

            synced += 1
            print(f"  ✅ Synced: {filename} ({size_kb} KB)")

        except Exception as e:
            print(f"  ❌ Failed: {filename} — {e}")
            failed += 1
            failed_files.append(filename)

    total = synced + skipped + failed
    print(f"🔄 Auto-sync complete: {synced} synced, {skipped} already up-to-date, {failed} failed\n")
    return {
        "synced": synced,
        "skipped": skipped,
        "failed": failed,
        "failed_files": failed_files,
        "total": total,
        "timestamp": datetime.utcnow().isoformat()
    }
