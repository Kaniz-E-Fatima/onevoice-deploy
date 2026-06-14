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
    "english": "MANDATORY: Reply in English ONLY. Do NOT use any Hindi, Urdu, Telugu, Tamil words or code-mixing. Pure English response required.",
    "hindi": "अनिवार्य: केवल देवनागरी लिपि में उत्तर दें। Example: 'आपकी परीक्षा फीस Rs.4250 है।' (MANDATORY: Reply ONLY in Hindi Devanagari script. Never use Roman/English letters for Hindi words.)",
    "urdu": "لازمی: صرف اردو عربی رسم الخط میں جواب دیں۔ Example: 'آپ کی امتحانی فیس Rs.4250 ہے۔' (MANDATORY: Every Urdu word must use Arabic script ا ب پ ت ث ج. NEVER Roman letters for Urdu words.)",
    "telugu": "తప్పనిసరి: తెలుగు లిపిలో మాత్రమే సమాధానం ఇవ్వండి. Example: 'మీ పరీక్ష రుసుము Rs.4250.' (MANDATORY: Telugu script only, no Roman letters for Telugu words.)",
    "tamil": "கட்டாயம்: தமிழ் எழுத்தில் மட்டும் பதில் சொல்லுங்கள். Example: 'உங்கள் தேர்வு கட்டணம் Rs.4250.' (MANDATORY: Tamil script only.)",
    "hinglish": "MANDATORY: Reply in Hinglish ONLY — Hindi words written in Roman/Latin script mixed with English. Example: 'Aapka exam fee Rs.4250 hai, last date 12 December hai.' Do NOT use Devanagari script.",
    "telugish": "MANDATORY: Reply in Telugish ONLY — Telugu words in Roman script mixed with English. Example: 'Mee exam fee Rs.4250 undi, last date December 12 undi.' Do NOT use Telugu script.",
    "urdulish": "MANDATORY: Reply in Urdulish ONLY — Urdu words in Roman/Latin script mixed with English. Example: 'Aapka exam fee Rs.4250 hai, last date December 12 hai.' Do NOT use Arabic script.",
    "tamlish": "MANDATORY: Reply in Tamlish ONLY — Tamil words in Roman script mixed with English. Example: 'Ungal exam fee Rs.4250, last date December 12 irukku.' Do NOT use Tamil script.",
}

SYSTEM_PROMPT = """You are Sarathi, a helpful student support digital assistant for NGIT and KMIT.

Answer questions about exam fees, timetables, results, placements, events, workshops, cultural celebrations, and anything else related to NGIT and KMIT.

IMPORTANT RULES:
1. LANGUAGE: You MUST follow the LANGUAGE INSTRUCTION below — it is set by the student's explicit choice. Do NOT override it based on how the student types. If instruction says English, reply in English even if the question looks like Hinglish.
2. KNOWLEDGE: Use the KNOWLEDGE BASE provided. If specific details exist there, use them. Do not say 'I don't have information' if the knowledge base contains relevant content.
3. COMPLETENESS: Give complete, helpful answers. Include specific dates, fees, names of events when available in the knowledge base.
4. FALLBACK: Only if information is truly not in the knowledge base, say so briefly.

You understand questions in English, Hindi, Urdu, Telugu, Tamil and all their mixed forms."""

def _has_non_latin_script(text: str) -> bool:
    """Return True only if the text contains actual non-Latin script characters.
    Pure ASCII / romanized text (e.g. 'Mera fee kya hai') returns False."""
    for ch in text:
        cp = ord(ch)
        # Devanagari (Hindi), Arabic (Urdu), Telugu, Tamil ranges
        if (0x0900 <= cp <= 0x097F or   # Devanagari
            0x0600 <= cp <= 0x06FF or   # Arabic / Urdu
            0x0C00 <= cp <= 0x0C7F or   # Telugu
            0x0B80 <= cp <= 0x0BFF):    # Tamil
            return True
    return False

async def get_gemini_response(query: str, context: str, chat_history: list = None, language: str = "english") -> str:
    if chat_history is None:
        chat_history = []
    try:
        # ✅ Only auto-detect language when the text contains actual non-Latin
        # script characters (Devanagari, Arabic, Telugu, Tamil).
        # Pure ASCII / romanized text always respects the user's UI selection.
        if _has_non_latin_script(query):
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

        system = f"{SYSTEM_PROMPT}\n\nLANGUAGE INSTRUCTION (STRICT - follow this regardless of chat history): {lang_instruction} Do NOT switch languages mid-response. Do NOT mix languages unless the instruction explicitly calls for code-mixing.\n\nKNOWLEDGE BASE:\n{context}"

        messages = [
            {"role": "system", "content": system},
            *history_messages,
            {"role": "user", "content": query}
        ]

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            max_tokens=500,
            temperature=0.4
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Groq error: {e}")
        return "I'm sorry, I'm having trouble connecting right now. Please try again or contact the college at www.stanley.edu.in"