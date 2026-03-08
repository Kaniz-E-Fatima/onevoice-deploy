from fastapi import APIRouter, HTTPException, Header
from config import ADMIN_SECRET_KEY
from database.connection import get_db

router = APIRouter()

def verify_admin(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.get("/admin/sessions")
async def get_sessions(x_admin_key: str = Header(None)):
    verify_admin(x_admin_key)
    db = get_db()
    cursor = db.chat_sessions.find().sort("updated_at", -1).limit(50)
    sessions = await cursor.to_list(length=50)
    for s in sessions:
        s["_id"] = str(s["_id"])
    return sessions
