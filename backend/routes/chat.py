from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.gemini_service import get_gemini_response
from services.rag_service import get_context
from database.connection import get_db
from database.models import chat_session_doc, chat_message_doc
import uuid
from datetime import datetime
from jose import jwt, JWTError          # ADD THIS
from config import JWT_SECRET            # ADD THIS

router = APIRouter()

# ADD this helper function
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
    token: Optional[str] = None          # ADD THIS

@router.post("/chat")
async def chat(request: ChatRequest):
    db = get_db()
    session_id = request.session_id or str(uuid.uuid4())
    user_email = get_user_from_token(request.token)   # ADD THIS

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
             "$set": {"updated_at": now, "user_email": user_email}}   # ADD user_email
        )
    else:
        doc = chat_session_doc(session_id, [user_msg, bot_msg])
        doc["user_email"] = user_email    # ADD THIS
        await db.chat_sessions.insert_one(doc)

    await db.analytics.insert_one({
        "session_id": session_id,
        "intent": intent,
        "language": request.language,
        "timestamp": now,
        "user_email": user_email          # ADD THIS
    })

    return {"reply": reply, "session_id": session_id, "intent": intent}