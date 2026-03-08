import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

INTENT_MAP = {
    "exam_fees": "exam_fees.txt", 
    "timetables": "timetables.txt", 
    "results": "results.txt", 
    "revaluation": "results.txt", 
    "placements": "placements.txt", 
    "events": "events.txt", 
    "conference": "events.txt", 
    "bootcamp": "events.txt", 
    "holiday": "events.txt", 
    "tuition_fee": "exam_fees.txt", 
    "college_fee": "exam_fees.txt"
}

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
    "hsbc": "placements", "event": "events", "conference": "conference", 
    "workshop": "events", "bootcamp": "bootcamp", "holiday": "holiday"
}

def detect_intent(query: str) -> str:
    query_lower = query.lower()
    for keyword, intent in KEYWORD_INTENT.items():
        if keyword in query_lower:
            return intent
    return "general"

def load_knowledge(intent: str) -> str:
    filename = INTENT_MAP.get(intent)
    if not filename:
        all_text = ""
        for fname in os.listdir(DATA_DIR):
            if fname.endswith(".txt"):
                with open(os.path.join(DATA_DIR, fname), "r") as f:
                    all_text += f.read() + "\n\n"
        return all_text
    
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return f.read()
    return ""

def get_context(query: str) -> tuple[str, str]:
    intent = detect_intent(query)
    context = load_knowledge(intent)
    return context, intent
