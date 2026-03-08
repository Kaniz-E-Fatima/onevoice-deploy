from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid, time
from services.rag_service import get_context
from services.gemini_service import get_gemini_response
from database.connection import get_db
from database.models import chat_session_doc, chat_message_doc, analytics_doc

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    intent: str

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    db = get_db()
    session_id = req.session_id or str(uuid.uuid4())
    start_time = time.time()
    
    if db is not None:
        existing = await db.chat_sessions.find_one({"session_id": session_id})
        if not existing:
            await db.chat_sessions.insert_one(chat_session_doc(session_id))
            
    chat_history = []
    if db is not None:
        cursor = db.chat_messages.find({"session_id": session_id}).sort("timestamp", -1).limit(6)
        msgs = await cursor.to_list(length=6)
        chat_history = list(reversed(msgs))
        
    context, intent = get_context(req.message)
    reply = await get_gemini_response(req.message, context, chat_history)
    
    if db is not None:
        await db.chat_messages.insert_one(chat_message_doc(session_id, "user", req.message, intent))
        await db.chat_messages.insert_one(chat_message_doc(session_id, "assistant", reply, intent))
        await db.chat_sessions.update_one(
            {"session_id": session_id}, 
            {"$inc": {"message_count": 2}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
        response_time_ms = int((time.time() - start_time) * 1000)
        await db.analytics.insert_one(analytics_doc(session_id, req.message, intent, response_time_ms))
        
    return ChatResponse(reply=reply, session_id=session_id, intent=intent)
