from datetime import datetime

def chat_session_doc(session_id: str, language: str = "en"):
    return {
        "session_id": session_id, 
        "language": language, 
        "created_at": datetime.utcnow(), 
        "updated_at": datetime.utcnow(), 
        "message_count": 0
    }

def chat_message_doc(session_id: str, role: str, content: str, intent: str = "general"):
    return {
        "session_id": session_id, 
        "role": role, 
        "content": content, 
        "intent": intent, 
        "timestamp": datetime.utcnow()
    }

def knowledge_doc(filename: str, content: str, category: str):
    return {
        "filename": filename, 
        "category": category, 
        "content": content, 
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
