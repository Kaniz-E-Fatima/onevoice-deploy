import os
from database.connection import get_db

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

KEYWORD_INTENT = {
    # Exam fees & payments
    "exam fee": "exam_fees", "fee": "exam_fees", "payment": "exam_fees",
    "fine": "exam_fees", "last date": "exam_fees", "deadline": "exam_fees",
    "how to pay": "exam_fees", "stanleyexams": "exam_fees", "tuition": "exam_fees",
    "notification": "exam_fees", "arrear": "exam_fees", "backlog fee": "exam_fees",
    "minor degree": "exam_fees", "mba fee": "exam_fees", "mtech fee": "exam_fees",
    "one time chance": "exam_fees", "exam expenses": "exam_fees",
    # Timetables & schedules
    "timetable": "timetables", "time table": "timetables", "exam date": "timetables",
    "schedule": "timetables", "when is": "timetables", "internal": "timetables",
    "makeup exam": "timetables", "supplementary timetable": "timetables",
    "revised timetable": "timetables",
    # Results & revaluation
    "result": "results", "results": "results", "marks": "results",
    "revaluation": "results", "photocopy": "results", "memo": "results",
    "challenge valuation": "results", "published": "results", "declared": "results",
    "osmania": "results",
    # Placements
    "placement": "placements", "job": "placements", "company": "placements",
    "package": "placements", "lpa": "placements", "infosys": "placements",
    "hsbc": "placements", "ubs": "placements", "hcl": "placements",
    "deccan ai": "placements", "alstom": "placements", "purview": "placements",
    "savantis": "placements", "congratulations": "placements", "placed": "placements",
    "campus recruitment": "placements", "crt": "placements",
    # Events, workshops, holidays, conferences
    "event": "events", "conference": "events", "workshop": "events",
    "bootcamp": "events", "holiday": "events", "hackathon": "events",
    "3d printing": "events", "drone": "events", "iot": "events",
    "internet of things": "events", "genai": "events", "forge": "events",
    "icatdm": "events", "disaster management": "events", "women": "events",
    "holi": "events", "celebration": "events", "entrepreneurship": "events",
    "cybersecurity": "events", "cyber security": "events", "chevening": "events",
    "awareness program": "events",
}


INTENT_FILENAMES = {
    "exam_fees": "exam_fees.txt",
    "timetables": "timetables.txt",
    "results": "results.txt",
    "placements": "placements.txt",
    "events": "events.txt"
}

# Words too generic to be useful for filename matching
PDF_STOP_WORDS = {
    "what", "when", "where", "how", "why", "who", "is", "are", "was",
    "the", "a", "an", "in", "at", "of", "for", "me", "tell", "about",
    "any", "do", "i", "my", "can", "give", "there", "college", "stanley",
    "please", "and", "or", "to", "that", "this", "with", "from", "on",
    "have", "has", "had", "been", "will", "would", "could", "should",
    "event", "events", "information", "info", "details", "know",
}

def detect_intent(query: str) -> str:
    query_lower = query.lower()
    for keyword, intent in KEYWORD_INTENT.items():
        if keyword in query_lower:
            return intent
    return "general"


async def get_relevant_pdf_links(query: str) -> list:
    """
    Separately search PDF filenames that are relevant to the user's query.
    This gives accurate, query-specific PDF links rather than whatever docs
    happened to be pulled for context.
    """
    try:
        db = get_db()
        if db is None:
            return []

        # Extract meaningful keywords from the query (min 3 chars, not stop words)
        keywords = [
            w for w in query.lower().split()
            if len(w) >= 3 and w not in PDF_STOP_WORDS
        ]

        if not keywords:
            return []

        # Search PDF filenames in knowledge_base for these keywords
        filename_filter = {
            "$and": [
                {"file_type": "pdf"},
                {"$or": [
                    {"filename": {"$regex": kw, "$options": "i"}}
                    for kw in keywords[:6]
                ]}
            ]
        }
        docs = await db.knowledge_base.find(
            filename_filter,
            {"filename": 1}
        ).to_list(length=4)

        return [d["filename"] for d in docs if d.get("filename")]

    except Exception as e:
        print(f"PDF link search error: {e}")
        return []


async def get_context_from_db(intent: str, query: str = "") -> tuple:
    try:
        db = get_db()
        if db is None:
            return "", []

        docs = []

        # ── Step 1: Query-keyword content search (works for ALL intents) ──
        if query:
            stop_words = {"what", "when", "where", "how", "why", "who", "is", "are",
                          "was", "the", "a", "an", "in", "at", "of", "for", "me",
                          "tell", "about", "any", "do", "i", "my", "can", "give",
                          "there", "college", "stanley", "please"}
            keywords = [
                w for w in query.lower().split()
                if len(w) > 3 and w not in stop_words
            ]
            if keywords:
                content_filter = {
                    "$or": [
                        {"content": {"$regex": kw, "$options": "i"}}
                        for kw in keywords[:5]
                    ]
                }
                docs = await db.knowledge_base.find(content_filter).to_list(length=6)

        # ── Step 2: Intent-based exact filename match ──
        if not docs and intent != "general":
            target_file = INTENT_FILENAMES.get(intent)
            if target_file:
                docs = await db.knowledge_base.find(
                    {"filename": target_file}
                ).to_list(length=1)

        # ── Step 3: Intent keyword filename search ──
        if not docs and intent != "general":
            keywords = intent.replace("_", " ").split()
            query_filter = {
                "$or": [
                    {"filename": {"$regex": kw, "$options": "i"}}
                    for kw in keywords
                ]
            }
            docs = await db.knowledge_base.find(query_filter).to_list(length=5)

        # ── Step 4: Fallback — all txt files ──
        if not docs:
            docs = await db.knowledge_base.find(
                {"file_type": "txt"}
            ).to_list(length=10)

        # ── Step 5: Last resort — any docs at all ──
        if not docs:
            docs = await db.knowledge_base.find({}).to_list(length=10)

        # Build context text and collect PDF links from retrieved docs
        contents = []
        pdf_filenames = []
        for d in docs:
            c = d.get("content", "")
            fname = d.get("filename", "")
            if c.strip():
                contents.append(c[:3000])
            if fname and fname.lower().endswith(".pdf") and fname not in pdf_filenames:
                pdf_filenames.append(fname)

        return "\n\n".join(contents), pdf_filenames

    except Exception as e:
        print(f"DB context error: {e}")
        return "", []


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
    context, context_pdfs = await get_context_from_db(intent, query)
    if not context.strip():
        print("MongoDB empty, falling back to local files")
        context = get_context_from_files(intent)

    # Direct filename matches take priority; context PDFs fill in the rest
    direct_pdfs = await get_relevant_pdf_links(query)
    combined_pdfs = direct_pdfs[:]
    for pdf in context_pdfs:
        if pdf not in combined_pdfs:
            combined_pdfs.append(pdf)

    return context, intent, combined_pdfs