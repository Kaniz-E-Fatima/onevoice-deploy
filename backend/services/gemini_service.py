from groq import Groq
from config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)

LANGUAGE_INSTRUCTIONS = {
    "english": "Always reply in English.",
    "hindi": "हमेशा हिंदी में जवाब दें। (Always reply in Hindi)",
    "urdu": "ہمیشہ اردو میں جواب دیں۔ (Always reply in Urdu)",
    "telugu": "ఎల్లప్పుడూ తెలుగులో సమాధానం ఇవ్వండి. (Always reply in Telugu)",
    "tamil": "எப்போதும் தமிழில் பதில் சொல்லுங்கள். (Always reply in Tamil)",
}

SYSTEM_PROMPT = """You are OneVoice, a helpful student support chatbot for Stanley College of Engineering and Technology for Women, Hyderabad. 

Answer questions about exam fees, timetables, results, placements, and college events. Be friendly and concise. 

If information is not available, say you don't have that information and direct them to www.stanley.edu.in

Always direct students to www.stanleyexams.in for fee payment and results.

You understand questions in English, Hindi, Urdu, Telugu, and Tamil."""

async def get_gemini_response(query: str, context: str, chat_history: list = None, language: str = "english") -> str:
    if chat_history is None:
        chat_history = []
    try:
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["english"])

        history_messages = []
        if chat_history:
            for msg in chat_history[-4:]:
                role = "user" if msg["role"] == "user" else "assistant"
                history_messages.append({"role": role, "content": msg["content"]})

        system = f"{SYSTEM_PROMPT}\n\nLANGUAGE INSTRUCTION: {lang_instruction}\n\nKNOWLEDGE BASE:\n{context}"

        messages = [
            {"role": "system", "content": system},
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