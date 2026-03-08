from fastapi import APIRouter
from database.connection import get_db

router = APIRouter()

@router.get("/analytics/summary")
async def get_summary():
    db = get_db()
    if db is None:
        return {"error": "Database not connected"}
        
    total_sessions = await db.chat_sessions.count_documents({})
    total_messages = await db.chat_messages.count_documents({"role": "user"})
    
    pipeline = [
        {"$match": {"role": "user"}}, 
        {"$group": {"_id": "$intent", "count": {"$sum": 1}}}, 
        {"$sort": {"count": -1}}, 
        {"$limit": 5}
    ]
    
    top_intents = await db.chat_messages.aggregate(pipeline).to_list(length=5)
    
    return {
        "total_sessions": total_sessions, 
        "total_queries": total_messages, 
        "top_intents": [{"intent": i["_id"], "count": i["count"]} for i in top_intents]
    }
