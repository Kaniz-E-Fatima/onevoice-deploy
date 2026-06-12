from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import httpx
from jose import jwt
from datetime import datetime, timedelta
from config import (
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL, JWT_SECRET, FRONTEND_URL, ADMIN_EMAIL
)

router = APIRouter()

# ✅ Multiple admin emails
ADMIN_EMAILS = [
    ADMIN_EMAIL,
    "sofiasam144@gmail.com"
]

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

def create_jwt(user_data: dict) -> str:
    payload = {
        "sub": user_data["google_id"],
        "email": user_data["email"],
        "name": user_data["name"],
        "picture": user_data["picture"],
        "role": "admin",
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

@router.get("/auth/google")
async def google_login():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_CALLBACK_URL,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline"
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")

@router.get("/auth/google/callback")
async def google_callback(code: str):
    async with httpx.AsyncClient() as client:
        token_res = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_CALLBACK_URL,
            "grant_type": "authorization_code"
        })
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token")

        user_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        google_user = user_res.json()

    # ✅ Check against list of allowed admins
    if google_user["email"] not in ADMIN_EMAILS:
        return RedirectResponse(f"{FRONTEND_URL}/admin?error=unauthorized")

    user_data = {
        "google_id": google_user["id"],
        "email": google_user["email"],
        "name": google_user["name"],
        "picture": google_user.get("picture", ""),
    }

    token = create_jwt(user_data)
    return RedirectResponse(f"{FRONTEND_URL}/admin?token={token}")

@router.get("/auth/me")
async def get_me(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {"user": payload}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")