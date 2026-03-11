import os
import glob

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

# ── Intent detection ──────────────────────────────────────────────────────────
KEYWORD_INTENT = {
    "exam fee": "exam_fees", "fee": "exam_fees", "payment": "exam_fees",
    "fine": "exam_fees", "last date": "exam_fees", "deadline": "exam_fees",
    "how to pay": "exam_fees", "stanleyexams": "exam_fees", "tuition": "exam_fees",
    "timetable": "timetables", "time table": "timetables", "exam date": "timetables",
    "schedule": "timetables", "when is": "timetables", "internal": "timetables",
    "result": "results", "results": "results", "marks": "results",
    "revaluation": "revaluation", "photocopy": "revaluation", "memo": "results",
    "placement": "placements", "job": "placements", "company": "placements",
    "package": "placements", "lpa": "placements", "infosys": "placements",
    "hsbc": "placements", "event": "events", "conference": "events",
    "workshop": "events", "bootcamp": "events", "holiday": "events",
    "b25": "exam_fees", "b24": "exam_fees", "b23": "exam_fees",
    "b22": "exam_fees", "r21": "exam_fees", "mba": "exam_fees",
    "mtech": "exam_fees", "minor": "exam_fees",
    "परीक्षा": "exam_fees", "शुल्क": "exam_fees", "टाइमटेबल": "timetables",
    "परिणाम": "results", "रिजल्ट": "results", "प्लेसमेंट": "placements", "फीस": "exam_fees",
    "పరీక్ష": "exam_fees", "రుసుము": "exam_fees", "ఫలితాలు": "results", "ప్లేస్‌మెంట్": "placements",
    "தேர்வு": "exam_fees", "கட்டணம்": "exam_fees", "முடிவுகள்": "results", "வேலைவாய்ப்பு": "placements",
    "امتحان": "exam_fees", "فیس": "exam_fees", "نتائج": "results", "پلیسمنٹ": "placements",
}

INTENT_PDF_KEYWORDS = {
    "exam_fees": ["fee", "Fee", "FEE", "Notification", "Tuition", "tuition", "Minor", "B25", "B24", "B23", "B22", "R21", "MBA", "MTECH", "MTech"],
    "timetables": ["Timetable", "timetable", "TT", "Time Table", "Schedule", "January 2025", "December 2025", "February 2026", "April 2025", "July 2025"],
    "results": ["Result", "result", "Results", "Revaluation", "revaluation", "Published", "published"],
    "revaluation": ["Revaluation", "revaluation", "Photocopy"],
    "placements": ["Placement", "placement", "Placements"],
    "events": ["Bootcamp", "bootcamp", "Conference", "ICATDM", "Circular", "Holiday", "IoT", "Drone"],
}

def detect_intent(query: str) -> str:
    query_lower = query.lower()
    for keyword, intent in KEYWORD_INTENT.items():
        if keyword.lower() in query_lower:
            return intent
    return "general"

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        import fitz
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except ImportError:
        pass
    except Exception as e:
        print(f"PyMuPDF error ({pdf_path}): {e}")
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text.strip()
    except Exception as e:
        print(f"pypdf error ({pdf_path}): {e}")
        return ""

def get_pdfs_for_intent(intent: str) -> list:
    if not os.path.exists(DATA_DIR):
        return []
    all_pdfs = glob.glob(os.path.join(DATA_DIR, "*.pdf"))
    if not all_pdfs:
        return []
    if intent == "general":
        return sorted(all_pdfs)[:4]
    keywords = INTENT_PDF_KEYWORDS.get(intent, [])
    if not keywords:
        return sorted(all_pdfs)[:3]
    matched = []
    for pdf_path in all_pdfs:
        filename = os.path.basename(pdf_path)
        if any(kw in filename for kw in keywords):
            matched.append(pdf_path)
    # Sort smaller files first (more focused)
    matched.sort(key=lambda p: os.path.getsize(p))
    return matched if matched else sorted(all_pdfs)[:3]

def load_txt_fallback(intent: str) -> str:
    intent_to_file = {
        "exam_fees": "exam_fees.txt",
        "timetables": "timetables.txt",
        "results": "results.txt",
        "revaluation": "results.txt",
        "placements": "placements.txt",
        "events": "events.txt",
    }
    filename = intent_to_file.get(intent)
    if filename:
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
    all_text = ""
    for fname in sorted(os.listdir(DATA_DIR)):
        if fname.endswith(".txt"):
            try:
                with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
                    all_text += f.read() + "\n\n"
            except Exception:
                pass
    return all_text

def get_context(query: str) -> tuple:
    intent = detect_intent(query)
    print(f"[RAG] Intent: {intent}")

    pdf_files = get_pdfs_for_intent(intent)
    print(f"[RAG] PDFs found: {len(pdf_files)}")

    combined_text = ""
    for pdf_path in pdf_files[:4]:
        text = extract_text_from_pdf(pdf_path)
        if text and len(text) > 50:
            filename = os.path.basename(pdf_path)
            combined_text += f"\n\n--- {filename} ---\n{text[:1500]}"

    if combined_text.strip():
        txt_data = load_txt_fallback(intent)
        final_context = combined_text + "\n\n--- Additional Info ---\n" + txt_data
        return final_context[:5000], intent

    print(f"[RAG] Using .txt fallback")
    return load_txt_fallback(intent)[:5000], intent
