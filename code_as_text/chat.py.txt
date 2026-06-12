from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.gemini_service import get_gemini_response
from services.rag_service import get_context
from database.connection import get_db
import uuid
from datetime import datetime
from jose import jwt, JWTError
from config import JWT_SECRET

router = APIRouter()

def get_user_from_token(token: str = None):
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("email")
    except JWTError:
        return None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = "english"
    token: Optional[str] = None

class FeedbackRequest(BaseModel):
    session_id: str
    message_index: int
    feedback: str

class ErrorMessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    error_reply: str

SUGGESTIONS = {
    "exam_fees": ["How do I pay exam fees?", "What is the last date for fee payment?", "What if I miss the deadline?"],
    "timetables": ["When are BE III sem exams?", "What time do exams start?", "Where can I find timetables?"],
    "results": ["How do I check my results?", "How to apply for revaluation?", "What is the revaluation fee?"],
    "placements": ["Which companies visited campus?", "What is the highest package?", "How many students got placed?"],
    "events": ["What events are coming up?", "How to register for conference?", "Any workshops available?"],
    "general": ["What are the exam fees?", "How do I check results?", "Tell me about placements"]
}

@router.post("/chat")
async def chat(request: ChatRequest):
    db = get_db()
    session_id = request.session_id or str(uuid.uuid4())
    user_email = get_user_from_token(request.token)
    now = datetime.utcnow()

    context, intent = await get_context(request.message)

    session = await db.chat_sessions.find_one({"session_id": session_id})
    chat_history = session.get("messages", []) if session else []

    context_summary = ""
    if len(chat_history) > 0:
        context_summary = "\n\nPREVIOUS CONVERSATION SUMMARY:\n"
        for msg in chat_history[-10:]:
            if isinstance(msg, dict):
                role = "Student" if msg.get("role") == "user" else "OneVoice"
                content = msg.get("content", "")
                if isinstance(content, str) and content.strip():
                    context_summary += f"{role}: {content[:200]}\n"

    reply = await get_gemini_response(
        query=request.message,
        context=context + context_summary,
        chat_history=chat_history,
        language=request.language
    )

    user_msg = {"role": "user", "content": request.message, "timestamp": now}
    bot_msg = {"role": "assistant", "content": reply, "timestamp": now}

    if session:
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": {"$each": [user_msg, bot_msg]}},
                "$set": {
                    "updated_at": now,
                    "user_email": user_email,
                    "language": request.language
                },
                "$inc": {"message_count": 2}
            }
        )
    else:
        await db.chat_sessions.insert_one({
            "session_id": session_id,
            "language": request.language or "english",
            "created_at": now,
            "updated_at": now,
            "message_count": 2,
            "user_email": user_email,
            "messages": [user_msg, bot_msg]
        })

    await db.analytics.insert_one({
        "session_id": session_id,
        "intent": intent,
        "language": request.language,
        "timestamp": now,
        "user_email": user_email
    })

    return {
        "reply": reply,
        "session_id": session_id,
        "intent": intent,
        "suggestions": SUGGESTIONS.get(intent, SUGGESTIONS["general"]),
        "bot_message_db_index": len(chat_history) + 1
    }


@router.post("/chat/feedback")
async def save_feedback(request: FeedbackRequest):
    db = get_db()
    session = await db.chat_sessions.find_one({"session_id": request.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = session.get("messages", [])
    if request.message_index < len(messages):
        await db.chat_sessions.update_one(
            {"session_id": request.session_id},
            {"$set": {f"messages.{request.message_index}.feedback": request.feedback}}
        )
        return {"message": "Feedback saved"}
    raise HTTPException(status_code=400, detail="Invalid message index")


@router.post("/chat/error")
async def save_error_message(request: ErrorMessageRequest):
    db = get_db()
    session_id = request.session_id or str(uuid.uuid4())
    now = datetime.utcnow()

    user_msg = {"role": "user", "content": request.message, "timestamp": now}
    bot_msg = {"role": "assistant", "content": request.error_reply, "timestamp": now}

    session = await db.chat_sessions.find_one({"session_id": session_id})
    chat_history = session.get("messages", []) if session else []

    if session:
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": {"$each": [user_msg, bot_msg]}},
                "$set": {"updated_at": now},
                "$inc": {"message_count": 2}
            }
        )
    else:
        await db.chat_sessions.insert_one({
            "session_id": session_id,
            "language": "english",
            "created_at": now,
            "updated_at": now,
            "message_count": 2,
            "messages": [user_msg, bot_msg]
        })

    return {
        "session_id": session_id,
        "bot_message_db_index": len(chat_history) + 1
    }