import os
from database.connection import get_db

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

INTENT_MAP = {
    "exam_fees": ["exam", "fee", "fees"],
    "timetables": ["timetable", "schedule", "time table"],
    "results": ["result", "results", "marks", "memo"],
    "placements": ["placement", "job", "company", "package", "lpa"],
    "events": ["event", "workshop", "bootcamp", "conference", "holiday"]
}

KEYWORD_INTENT = {
    "exam fee": "exam_fees", "fee": "exam_fees", "payment": "exam_fees",
    "fine": "exam_fees", "last date": "exam_fees", "deadline": "exam_fees",
    "how to pay": "exam_fees", "stanleyexams": "exam_fees", "tuition": "exam_fees",
    "timetable": "timetables", "time table": "timetables", "exam date": "timetables",
    "schedule": "timetables", "when is": "timetables", "internal": "timetables",
    "result": "results", "results": "results", "marks": "results",
    "revaluation": "results", "photocopy": "results", "memo": "results",
    "placement": "placements", "job": "placements", "company": "placements",
    "package": "placements", "lpa": "placements", "infosys": "placements",
    "hsbc": "placements", "event": "events", "conference": "events",
    "workshop": "events", "bootcamp": "events", "holiday": "events"
}

def detect_intent(query: str) -> str:
    query_lower = query.lower()
    for keyword, intent in KEYWORD_INTENT.items():
        if keyword in query_lower:
            return intent
    return "general"

async def get_context_from_db(intent: str) -> str:
    """Read knowledge from MongoDB first"""
    try:
        db = get_db()
        if db is None:
            return ""

        if intent == "general":
            # Get all documents
            cursor = db.knowledge_base.find({"active": True})
            docs = await cursor.to_list(length=20)
        else:
            # Search by filename keywords matching intent
            keywords = INTENT_MAP.get(intent, [intent])
            query_filter = {
                "active": True,
                "$or": [
                    {"filename": {"$regex": kw, "$options": "i"}}
                    for kw in keywords
                ]
            }
            cursor = db.knowledge_base.find(query_filter)
            docs = await cursor.to_list(length=5)

            # Fallback: get all if nothing found
            if not docs:
                cursor = db.knowledge_base.find({"active": True})
                docs = await cursor.to_list(length=20)

        return "\n\n".join([d.get("content", "") for d in docs if d.get("content")])
    except Exception as e:
        print(f"DB context error: {e}")
        return ""

def get_context_from_files(intent: str) -> str:
    """Fallback: read from local files"""
    try:
        if not os.path.exists(DATA_DIR):
            return ""
        all_text = ""
        for fname in os.listdir(DATA_DIR):
            if fname.endswith((".txt", ".pdf")):
                fpath = os.path.join(DATA_DIR, fname)
                try:
                    if fname.endswith(".pdf"):
                        import pymupdf
                        doc = pymupdf.open(fpath)
                        for page in doc:
                            all_text += page.get_text() + "\n"
                        doc.close()
                    else:
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                            all_text += f.read() + "\n\n"
                except Exception:
                    continue
        return all_text
    except Exception as e:
        print(f"File context error: {e}")
        return ""

async def get_context(query: str):
    intent = detect_intent(query)

    # ✅ Try MongoDB first
    context = await get_context_from_db(intent)

    # ✅ Fallback to local files if MongoDB is empty
    if not context.strip():
        print("MongoDB empty, falling back to local files")
        context = get_context_from_files(intent)

    return context, intent