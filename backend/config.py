import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
APP_ENV = os.getenv("APP_ENV", "development")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "changeme")
DB_NAME = "onevoice"
