from datetime import datetime

def chat_session_doc(session_id: str, language: str = "english"):
    return {
        "session_id": session_id,
        "language": language,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "message_count": 0,
        "messages": []
    }

def chat_message_doc(role: str, content: str, timestamp=None):
    return {
        "role": role,
        "content": content,
        "timestamp": timestamp or datetime.utcnow()
    }

# ✅ NEW: PDF document model for MongoDB storage
def pdf_doc(filename: str, content: str, file_type: str, size_kb: float):
    return {
        "filename": filename,
        "content": content,
        "file_type": file_type,
        "size_kb": size_kb,
        "uploaded_at": datetime.utcnow(),
        "active": True
    }

def analytics_doc(session_id: str, query: str, intent: str, response_time_ms: int):
    return {
        "session_id": session_id,
        "query": query,
        "intent": intent,
        "response_time_ms": response_time_ms,
        "timestamp": datetime.utcnow()
    }