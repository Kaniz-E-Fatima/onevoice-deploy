from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.gemini_service import get_gemini_response
from services.rag_service import get_context
from database.connection import get_db
from database.models import chat_session_doc, chat_message_doc
import uuid
from datetime import datetime

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = "english"

@router.post("/chat")
async def chat(request: ChatRequest):
    db = get_db()
    session_id = request.session_id or str(uuid.uuid4())

    context, intent = get_context(request.message)

    session = await db.chat_sessions.find_one({"session_id": session_id})
    chat_history = session.get("messages", []) if session else []

    reply = await get_gemini_response(
        query=request.message,
        context=context,
        chat_history=chat_history,
        language=request.language
    )

    now = datetime.utcnow()
    user_msg = chat_message_doc("user", request.message, now)
    bot_msg = chat_message_doc("assistant", reply, now)

    if session:
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {"$push": {"messages": {"$each": [user_msg, bot_msg]}},
             "$set": {"updated_at": now}}
        )
    else:
        await db.chat_sessions.insert_one(
            chat_session_doc(session_id, [user_msg, bot_msg])
        )

    await db.analytics.insert_one({
        "session_id": session_id,
        "intent": intent,
        "language": request.language,
        "timestamp": now
    })

    return {"reply": reply, "session_id": session_id, "intent": intent}