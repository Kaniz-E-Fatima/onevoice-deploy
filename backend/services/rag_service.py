import os
from database.connection import get_db

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

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

INTENT_FILENAMES = {
    "exam_fees": "exam_fees.txt",
    "timetables": "timetables.txt",
    "results": "results.txt",
    "placements": "placements.txt",
    "events": "events.txt"
}

def detect_intent(query: str) -> str:
    query_lower = query.lower()
    for keyword, intent in KEYWORD_INTENT.items():
        if keyword in query_lower:
            return intent
    return "general"

async def get_context_from_db(intent: str) -> str:
    try:
        db = get_db()
        if db is None:
            return ""

        if intent == "general":
            # ✅ Get all txt files first (most useful), then PDFs
            docs = await db.knowledge_base.find(
                {"file_type": "txt"}
            ).to_list(length=10)
            if not docs:
                docs = await db.knowledge_base.find({}).to_list(length=20)
        else:
            # ✅ First try exact filename match
            target_file = INTENT_FILENAMES.get(intent)
            if target_file:
                docs = await db.knowledge_base.find(
                    {"filename": target_file}
                ).to_list(length=1)
            else:
                docs = []

            # ✅ Fallback: search by filename keywords
            if not docs:
                keywords = intent.replace("_", " ").split()
                query_filter = {
                    "$or": [
                        {"filename": {"$regex": kw, "$options": "i"}}
                        for kw in keywords
                    ]
                }
                docs = await db.knowledge_base.find(query_filter).to_list(length=5)

            # ✅ Final fallback: get all txt files
            if not docs:
                docs = await db.knowledge_base.find(
                    {"file_type": "txt"}
                ).to_list(length=10)

        contents = [d.get("content", "") for d in docs if d.get("content", "").strip()]
        return "\n\n".join(contents)

    except Exception as e:
        print(f"DB context error: {e}")
        return ""

def get_context_from_files(intent: str) -> str:
    try:
        if not os.path.exists(DATA_DIR):
            return ""
        all_text = ""
        for fname in os.listdir(DATA_DIR):
            if fname.endswith(".txt"):
                fpath = os.path.join(DATA_DIR, fname)
                try:
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
    context = await get_context_from_db(intent)
    if not context.strip():
        print("MongoDB empty, falling back to local files")
        context = get_context_from_files(intent)
    return context, intent