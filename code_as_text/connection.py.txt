from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, DB_NAME

client = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    print("✅ Connected to MongoDB Atlas")

async def close_db():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")

def get_db():
    return db
