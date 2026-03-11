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
    # Hindi keywords
    "परीक्षा": "exam_fees", "शुल्क": "exam_fees", "टाइमटेबल": "timetables",
    "परिणाम": "results", "रिजल्ट": "results", "प्लेसमेंट": "placements",
    # Telugu keywords
    "పరీక్ష": "exam_fees", "రుసుము": "exam_fees", "టైమ్‌టేబుల్": "timetables",
    "ఫలితాలు": "results", "ప్లేస్‌మెంట్": "placements",
    # Tamil keywords
    "தேர்வு": "exam_fees", "கட்டணம்": "exam_fees", "நேர அட்டவணை": "timetables",
    "முடிவுகள்": "results", "வேலைவாய்ப்பு": "placements",
    # Urdu keywords
    "امتحان": "exam_fees", "فیس": "exam_fees", "ٹائم ٹیبل": "timetables",
    "نتائج": "results", "پلیسمنٹ": "placements",
}

INTENT_TO_PDF_KEYWORDS = {
    "exam_fees": ["fee", "exam_fee", "notification", "tuition", "minor", "mba", "mtech"],
    "timetables": ["timetable", "time_table", "schedule", "tt"],
    "results": ["result", "revaluation", "memo"],
    "placements": ["placement"],
    "events": ["conference", "bootcamp", "circular", "holiday", "icatdm"],
}

def detect_intent(query: str) -> str:
    query_lower = query.lower()
    for keyword, intent in KEYWORD_INTENT.items():
        if keyword.lower() in query_lower:
            return intent
    return "general"

# ── PDF extraction ────────────────────────────────────────────────────────────
def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except ImportError:
        # Fallback to pypdf if fitz not available
        try:
            from pypdf import PdfReader
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text.strip()
        except Exception as e:
            print(f"PDF read error ({pdf_path}): {e}")
            return ""
    except Exception as e:
        print(f"PDF error ({pdf_path}): {e}")
        return ""

def get_pdf_files_for_intent(intent: str) -> list:
    """Get relevant PDF files based on intent."""
    if not os.path.exists(DATA_DIR):
        return []

    all_pdfs = glob.glob(os.path.join(DATA_DIR, "*.pdf"))
    if not all_pdfs:
        return []

    if intent == "general":
        # Return all PDFs for general queries (limit to avoid token overflow)
        return all_pdfs[:5]

    keywords = INTENT_TO_PDF_KEYWORDS.get(intent, [])
    if not keywords:
        return all_pdfs[:3]

    # Filter PDFs by filename keywords
    matched = []
    for pdf_path in all_pdfs:
        filename = os.path.basename(pdf_path).lower()
        if any(kw.lower() in filename for kw in keywords):
            matched.append(pdf_path)

    # If no matches found, return all PDFs
    return matched if matched else all_pdfs[:4]

def load_txt_fallback(intent: str) -> str:
    """Fallback to .txt files if no PDFs available."""
    intent_to_file = {
        "exam_fees": "exam_fees.txt",
        "timetables": "timetables.txt",
        "results": "results.txt",
        "placements": "placements.txt",
        "events": "events.txt",
    }
    filename = intent_to_file.get(intent)
    if filename:
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
    # Load all txt files for general
    all_text = ""
    for fname in os.listdir(DATA_DIR):
        if fname.endswith(".txt"):
            with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
                all_text += f.read() + "\n\n"
    return all_text

def get_context(query: str) -> tuple:
    """Main function - tries PDFs first, falls back to .txt files."""
    intent = detect_intent(query)

    # Try PDF extraction first
    pdf_files = get_pdf_files_for_intent(intent)
    if pdf_files:
        combined_text = ""
        for pdf_path in pdf_files[:3]:  # Max 3 PDFs to avoid token overflow
            text = extract_text_from_pdf(pdf_path)
            if text:
                filename = os.path.basename(pdf_path)
                combined_text += f"\n\n--- Source: {filename} ---\n{text}"

        if combined_text.strip():
            # Truncate to ~4000 chars to avoid token limits
            return combined_text[:4000], intent

    # Fallback to .txt files
    txt_context = load_txt_fallback(intent)
    return txt_context[:4000], intent
