import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
APP_ENV = os.getenv("APP_ENV", "development")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "changeme")
DB_NAME = "onevoice"

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_CALLBACK_URL = os.getenv("GOOGLE_CALLBACK_URL", "http://localhost:8000/auth/google/callback")
JWT_SECRET = os.getenv("JWT_SECRET", "changeme_use_long_random_string")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")