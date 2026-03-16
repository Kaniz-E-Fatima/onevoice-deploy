from groq import Groq
from config import GROQ_API_KEY

def detect_language(text: str) -> str:
    telugu_chars = set('అఆఇఈఉఊఋఌఎఏఐఒఓఔకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహళఱఴ')
    hindi_chars = set('अआइईउऊएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसहक्षत्रज्ञ')
    urdu_chars = set('ابتثجحخدذرزسشصضطظعغفقکلمنوہیے')
    tamil_chars = set('அஆஇஈஉஊஎஏஐஒஓஔகஙசஞடணதநபமயரலவழளறனஜஷஸஹ')

    text_chars = set(text)
    if text_chars & telugu_chars:
        return "telugu"
    if text_chars & hindi_chars:
        return "hindi"
    if text_chars & urdu_chars:
        return "urdu"
    if text_chars & tamil_chars:
        return "tamil"
    return "english"

def detect_code_mix(text: str) -> str:
    """Detect code-mixed language like Hinglish, Telugish etc"""
    telugu_chars = set('అఆఇఈఉఊఋఌఎఏఐఒఓఔకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహళఱఴ')
    hindi_chars = set('अआइईउऊएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसहक्षत्रज्ञ')
    urdu_chars = set('ابتثجحخدذرزسشصضطظعغفقکلمنوہیے')
    tamil_chars = set('அஆஇஈஉஊஎஏஐஒஓஔகஙசஞடணதநபமயரலவழளறனஜஷஸஹ')

    text_chars = set(text)
    has_english = any(c.isascii() and c.isalpha() for c in text)
    has_telugu = bool(text_chars & telugu_chars)
    has_hindi = bool(text_chars & hindi_chars)
    has_urdu = bool(text_chars & urdu_chars)
    has_tamil = bool(text_chars & tamil_chars)

    if has_english and has_telugu: return "telugish"
    if has_english and has_hindi: return "hinglish"
    if has_english and has_urdu: return "urdulish"
    if has_english and has_tamil: return "tamlish"
    return None

client = Groq(api_key=GROQ_API_KEY)

LANGUAGE_INSTRUCTIONS = {
    "english": "Always reply in English.",
    "hindi": "हमेशा हिंदी में जवाब दें। (Always reply in Hindi)",
    "urdu": "ہمیشہ اردو میں جواب دیں۔ (Always reply in Urdu)",
    "telugu": "ఎల్లప్పుడూ తెలుగులో సమాధానం ఇవ్వండి. (Always reply in Telugu)",
    "tamil": "எப்போதும் தமிழில் பதில் சொல்லுங்கள். (Always reply in Tamil)",
    "hinglish": "Reply in Hinglish (mix of Hindi and English). Example: 'Aapka exam fee Rs.4250 hai, aur last date 12 December hai.'",
    "telugish": "Reply in Telugish (mix of Telugu and English). Example: 'Mee exam fee Rs.4250 undi, last date December 12 undi.'",
    "urdulish": "Reply in Urdulish (mix of Urdu and English). Example: 'Aapka exam fee Rs.4250 hai, aur last date 12 December hai.'",
    "tamlish": "Reply in Tamlish (mix of Tamil and English). Example: 'Ungal exam fee Rs.4250, last date December 12 irukku.'",
}

SYSTEM_PROMPT = """You are OneVoice, a helpful student support chatbot for Stanley College of Engineering and Technology for Women, Hyderabad.

Answer questions about exam fees, timetables, results, placements, and college events. Be friendly and concise.

You are an expert at understanding CODE-MIXED queries — when students mix two languages together like:
- Hinglish: "mera exam fee kya hai?" or "fee kab tak pay karna hai?"
- Telugish: "naa exam fee enti?" or "results ela chekku cheyali?"
- Urdulish: "mera result kab aayega?" or "fee kaise pay karein?"
- Tamlish: "exam fee evvalavu?" or "result eppo varum?"

Always understand the intent regardless of language mixing and respond in the SAME mixed style the student used.

If information is not available, say you don't have that information and direct them to www.stanley.edu.in

Always direct students to www.stanleyexams.in for fee payment and results.

You understand questions in English, Hindi, Urdu, Telugu, Tamil and all their mixed forms."""

async def get_gemini_response(query: str, context: str, chat_history: list = None, language: str = "english") -> str:
    if chat_history is None:
        chat_history = []
    try:
        # ✅ Auto detect language and code mixing
        detected = detect_language(query)
        code_mix = detect_code_mix(query)

        if code_mix:
            language = code_mix
        elif detected != "english":
            language = detected

        lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["english"])

        history_messages = []
        if chat_history:
            for msg in chat_history[-6:]:  # ✅ Increased to 6 for better context
                role = "user" if msg.get("role") == "user" else "assistant"
                content = msg.get("content", "")
                if isinstance(content, str) and content.strip():
                    history_messages.append({"role": role, "content": content})

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