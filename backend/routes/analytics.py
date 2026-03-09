from fastapi import APIRouter, Header
from database.connection import get_db
from config import ADMIN_SECRET_KEY

router = APIRouter()

@router.get("/analytics/summary")
async def get_summary(x_admin_key: str = Header(None)):
    db = get_db()
    if db is None:
        return {"error": "Database not connected"}

    total_sessions = await db.chat_sessions.count_documents({})

    # Count user messages across all sessions
    pipeline_msgs = [
        {"$project": {"message_count": {"$size": {"$ifNull": ["$messages", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$message_count"}}}
    ]
    msg_result = await db.chat_sessions.aggregate(pipeline_msgs).to_list(length=1)
    total_messages = msg_result[0]["total"] if msg_result else 0

    # Top intents from analytics collection
    pipeline_intents = [
        {"$group": {"_id": "$intent", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_intents_raw = await db.analytics.aggregate(pipeline_intents).to_list(length=5)

    # Language breakdown
    pipeline_langs = [
        {"$group": {"_id": "$language", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    lang_raw = await db.analytics.aggregate(pipeline_langs).to_list(length=10)

    # Today's sessions
    from datetime import datetime, timezone
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = await db.chat_sessions.count_documents({
        "updated_at": {"$gte": today_start}
    })

    return {
        "total_sessions": total_sessions,
        "total_queries": total_messages,
        "today_sessions": today_sessions,
        "top_intents": [{"_id": i["_id"] or "general", "count": i["count"]} for i in top_intents_raw],
        "language_breakdown": [{"_id": l["_id"] or "english", "count": l["count"]} for l in lang_raw]
    }
