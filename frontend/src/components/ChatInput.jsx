import { useState, useEffect, useRef } from 'react'

const PLACEHOLDERS = {
  english: 'Ask about fees, timetables, results...',
  hindi: 'परीक्षा शुल्क, टाइमटेबल पूछें...',
  urdu: 'فیس، ٹائم ٹیبل کے بارے میں پوچھیں...',
  telugu: 'రుసుములు, టైమ్‌టేబుల్ అడగండి...',
  tamil: 'கட்டணம், நேர அட்டவணை கேளுங்கள்...',
}

const LANG_CODES = {
  english: 'en-IN',
  hindi: 'hi-IN',
  urdu: 'ur-PK',
  telugu: 'te-IN',
  tamil: 'ta-IN',
}

export default function ChatInput({ onSend, loading, language }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript
        setText(transcript)
        setListening(false)
      }
      recognition.onerror = () => setListening(false)
      recognition.onend = () => setListening(false)
      recognitionRef.current = recognition
    }
  }, [])

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_CODES[language] || 'en-IN'
    }
  }, [language])

  const handleMic = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.')
      return
    }
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.lang = LANG_CODES[language] || 'en-IN'
      recognitionRef.current.start()
      setListening(true)
    }
  }

  const handleSubmit = () => {
    if (!text.trim() || loading) return
    onSend(text)
    setText('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="chat-input-row">
      <input
        className="chat-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder={PLACEHOLDERS[language] || PLACEHOLDERS.english}
        disabled={loading}
      />
      <button
        className={`chat-mic-btn ${listening ? 'listening' : ''}`}
        onClick={handleMic}
        title={listening ? 'Stop listening' : 'Voice input'}
      >
        {listening ? '⏹' : '🎤'}
      </button>
      <button
        className="chat-send-btn"
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
      >
        ➤
      </button>
    </div>
  )
}