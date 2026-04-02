"""
sync_service.py — Automatically syncs all files in the data/ folder → MongoDB knowledge_base.
Called on backend startup AND via the /admin/pdfs/sync endpoint.
"""

import os
import pymupdf
from datetime import datetime
from database.connection import get_db
from database.models import pdf_doc

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")
SUPPORTED_EXTENSIONS = (".pdf", ".txt")


def _extract_text(filepath: str, filename: str) -> str:
    """Extract plain text from a PDF or TXT file."""
    if filename.lower().endswith(".pdf"):
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
    else:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            print(f"  ⚠️  Could not read {filename}: {e}")
            return ""


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
                skipped += 1
                continue

            # Extract text
            text = _extract_text(filepath, filename)
            if not text:
                failed += 1
                continue

            file_type = "pdf" if filename.lower().endswith(".pdf") else "txt"
            doc_data = pdf_doc(
                filename=filename,
                content=text,
                file_type=file_type,
                size_kb=size_kb
            )

            # Upsert: replace old entry if filename exists but size changed
            await db.knowledge_base.delete_many({"filename": filename})
            await db.knowledge_base.insert_one(doc_data)
            synced += 1
            print(f"  ✅ Synced: {filename} ({size_kb} KB)")

        except Exception as e:
            print(f"  ❌ Failed: {filename} — {e}")
            failed += 1

    total = synced + skipped + failed
    print(f"🔄 Auto-sync complete: {synced} synced, {skipped} already up-to-date, {failed} failed\n")
    return {
        "synced": synced,
        "skipped": skipped,
        "failed": failed,
        "total": total,
        "timestamp": datetime.utcnow().isoformat()
    }
