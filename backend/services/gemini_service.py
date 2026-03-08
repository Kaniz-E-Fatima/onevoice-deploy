from groq import Groq
import os
from config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """You are OneVoice, a helpful student support chatbot for Stanley College of Engineering and Technology for Women, Hyderabad. Answer questions about exam fees, timetables, results, placements, and college events. Be friendly and concise. If information is not available, say: I don't have that information right now. Please check www.stanley.edu.in. Always direct students to www.stanleyexams.in for fee payment and results. You understand both English and Hinglish questions — always reply in English."""

async def get_gemini_response(query: str, context: str, chat_history: list = None) -> str:
    if chat_history is None:
        chat_history = []
    try:
        history_messages = []
        if chat_history:
            for msg in chat_history[-4:]:
                role = "user" if msg["role"] == "user" else "assistant"
                history_messages.append({"role": role, "content": msg["content"]})

        messages = [
            {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nKNOWLEDGE BASE:\n{context}"},
            *history_messages,
            {"role": "user", "content": query}
        ]

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Groq error: {e}")
        return "I'm sorry, I'm having trouble connecting right now. Please try again or contact the college at www.stanley.edu.in"