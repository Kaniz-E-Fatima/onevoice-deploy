import { useState, useEffect, useRef } from 'react'
import { sendMessage } from '../services/api'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import '../styles/widget.css'

const LANGUAGES = [
  { code: 'english', label: 'EN' },
  { code: 'hindi', label: 'हि' },
  { code: 'urdu', label: 'اردو' },
  { code: 'telugu', label: 'తె' },
  { code: 'tamil', label: 'த' },
]

const SUGGESTIONS = [
  'Exam Fees 💰',
  'Timetable 📅',
  'Results 📊',
  'Placements 🏢',
  'Events 🎉',
]

const WELCOME_MESSAGES = {
  english: "👋 Hi! I'm OneVoice, your Stanley College assistant. Ask me about exam fees, timetables, results, placements, or events!",
  hindi: "👋 नमस्ते! मैं OneVoice हूँ, आपका Stanley College सहायक। परीक्षा शुल्क, टाइमटेबल, परिणाम, या प्लेसमेंट के बारे में पूछें!",
  urdu: "👋 السلام علیکم! میں OneVoice ہوں، آپ کا Stanley College اسسٹنٹ۔ امتحانی فیس، ٹائم ٹیبل، نتائج یا پلیسمنٹ کے بارے میں پوچھیں!",
  telugu: "👋 నమస్కారం! నేను OneVoice, మీ Stanley College సహాయకుడిని. పరీక్ష రుసుములు, టైమ్‌టేబుల్, ఫలితాలు లేదా ప్లేస్‌మెంట్ గురించి అడగండి!",
  tamil: "👋 வணக்கம்! நான் OneVoice, உங்கள் Stanley College உதவியாளர். தேர்வு கட்டணம், நேர அட்டவணை, முடிவுகள் அல்லது வேலைவாய்ப்பு பற்றி கேளுங்கள்!",
}

const STORAGE_KEY = 'onevoice_chat_history'
const SETTINGS_KEY = 'onevoice_settings'

// ── Voice language map (expanded for better coverage) ─────────────────────────
const VOICE_LANG_MAP = {
  english: ['en-IN', 'en-US', 'en-GB'],
  hindi: ['hi-IN', 'hi'],
  urdu: ['ur-PK', 'ur-IN', 'ur'],
  telugu: ['te-IN', 'te'],
  tamil: ['ta-IN', 'ta-SG', 'ta'],
}

// ── Find best voice for language ──────────────────────────────────────────────
function findVoice(language) {
  const voices = window.speechSynthesis.getVoices()
  const preferred = VOICE_LANG_MAP[language] || ['en-IN']

  for (const code of preferred) {
    // Exact match first
    const exact = voices.find(v => v.lang === code)
    if (exact) return exact
    // Prefix match
    const prefix = voices.find(v => v.lang.startsWith(code.split('-')[0]))
    if (prefix) return prefix
  }

  // Last resort: use any available voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null
}

// ── Speak text ────────────────────────────────────────────────────────────────
function speakText(text, language) {
  if (!window.speechSynthesis) return

  // Always cancel any ongoing speech first
  window.speechSynthesis.cancel()

  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.88
    utterance.pitch = 1.05
    utterance.volume = 1

    const voice = findVoice(language)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      // Set lang manually even without a matched voice
      const langCodes = { english: 'en-IN', hindi: 'hi-IN', urdu: 'ur-PK', telugu: 'te-IN', tamil: 'ta-IN' }
      utterance.lang = langCodes[language] || 'en-IN'
    }

    utterance.onerror = (e) => console.warn('Speech error:', e.error)
    window.speechSynthesis.speak(utterance)
  }

  // Wait for voices to be loaded
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      doSpeak()
    }
  } else {
    doSpeak()
  }
}

// ── Stop speech ───────────────────────────────────────────────────────────────
function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [language, setLanguage] = useState('english')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY))?.darkMode || false } catch { return false }
  })
  const [voiceOutput, setVoiceOutput] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY))?.voiceOutput || false } catch { return false }
  })
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : [{ role: 'assistant', content: WELCOME_MESSAGES['english'] }]
    } catch { return [{ role: 'assistant', content: WELCOME_MESSAGES['english'] }] }
  })
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [typingText, setTypingText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Track speaking state
  useEffect(() => {
    if (!window.speechSynthesis) return
    const interval = setInterval(() => {
      setIsSpeaking(window.speechSynthesis.speaking)
    }, 300)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch { }
  }, [messages])

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ darkMode, voiceOutput })) } catch { }
  }, [darkMode, voiceOutput])

  const typeMessage = (text, onDone) => {
    setIsTyping(true)
    setTypingText('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setTypingText(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setIsTyping(false)
        setTypingText('')
        onDone(text)
      }
    }, 16)
  }

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    stopSpeech()
    setSessionId(null)
  }

  const handleSend = async (text) => {
    if (!text.trim()) return
    setShowSuggestions(false)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const data = await sendMessage(text, sessionId, language)
      setSessionId(data.session_id)
      setLoading(false)
      typeMessage(data.reply, (finalText) => {
        setMessages(prev => [...prev, { role: 'assistant', content: finalText, showFeedback: true }])
        if (voiceOutput) {
          setTimeout(() => speakText(finalText, language), 100)
        }
      })
    } catch (err) {
      setLoading(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting. Please visit www.stanley.edu.in or try again in a moment."
      }])
    }
  }

  const handleSuggestion = (suggestion) => {
    const text = suggestion.replace(/[💰📅📊🏢🎉]/g, '').trim()
    handleSend(text)
  }

  const handleFeedback = (index, type) => {
    setMessages(prev => prev.map((msg, i) =>
      i === index ? { ...msg, feedback: type, showFeedback: false } : msg
    ))
  }

  const clearHistory = () => {
    stopSpeech()
    setMessages([{ role: 'assistant', content: WELCOME_MESSAGES[language] }])
    setSessionId(null)
    setShowSuggestions(true)
    localStorage.removeItem(STORAGE_KEY)
  }

  // ── Voice button handler ───────────────────────────────────────────────────
  const handleVoiceToggle = () => {
    if (isSpeaking) {
      // If currently speaking → stop immediately
      stopSpeech()
      setIsSpeaking(false)
    } else {
      // Toggle voice output on/off
      setVoiceOutput(v => !v)
    }
  }

  return (
    <div className={`chat-widget-container ${darkMode ? 'dark' : ''} ${isMaximized ? 'maximized' : ''}`}>
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-top">
              <div className="chat-header-info">
                {/* College logo INSIDE the widget header */}
                <img src="/logo.png" alt="SC" className="chat-avatar" />
                <div>
                  <div className="chat-title">OneVoice</div>
                  <div className="chat-subtitle">Stanley College · AI Assistant</div>
                </div>
              </div>
              <div className="header-actions">
                {/* Voice button — stops if speaking, toggles if not */}
                <button
                  className={`icon-btn ${voiceOutput ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
                  onClick={handleVoiceToggle}
                  title={isSpeaking ? 'Stop speaking' : voiceOutput ? 'Voice ON (click to turn off)' : 'Voice OFF (click to turn on)'}
                >
                  {isSpeaking ? '⏹' : '🔊'}
                </button>
                <button className="icon-btn" onClick={() => setShowHistory(h => !h)} title="Chat history">📋</button>
                <button className="icon-btn" onClick={() => setDarkMode(d => !d)} title="Dark mode">
                  {darkMode ? '☀️' : '🌙'}
                </button>
                <button className="icon-btn" onClick={() => setIsMaximized(m => !m)} title="Maximize">
                  {isMaximized ? '⊡' : '⊞'}
                </button>
                <button className="icon-btn" onClick={clearHistory} title="Clear history">🗑️</button>
                <button className="chat-close-btn" onClick={() => { setIsOpen(false); stopSpeech() }}>✕</button>
              </div>
            </div>
            <div className="lang-selector">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={`lang-btn ${language === lang.code ? 'active' : ''}`}
                  onClick={() => handleLanguageChange(lang.code)}
                >{lang.label}</button>
              ))}
            </div>
          </div>

          {showHistory ? (
            <div className="history-panel">
              <div className="history-title">💬 Chat History ({messages.length} messages)</div>
              <div className="history-list">
                {messages.map((msg, i) => (
                  <div key={i} className={`history-item ${msg.role}`}>
                    <span className="history-role">{msg.role === 'user' ? '👤 You' : '🤖 OneVoice'}</span>
                    <span className="history-content">
                      {msg.content.slice(0, 80)}{msg.content.length > 80 ? '...' : ''}
                    </span>
                  </div>
                ))}
              </div>
              <button className="history-close-btn" onClick={() => setShowHistory(false)}>Back to Chat</button>
            </div>
          ) : (
            <>
              <ChatMessages
                messages={messages}
                loading={loading}
                onFeedback={handleFeedback}
                typingText={typingText}
                isTyping={isTyping}
              />
              {showSuggestions && (
                <div className="suggestions">
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="suggestion-btn" onClick={() => handleSuggestion(s)}>{s}</button>
                  ))}
                </div>
              )}
              <ChatInput onSend={handleSend} loading={loading || isTyping} language={language} />
            </>
          )}
        </div>
      )}

      {/* FAB button — text outside, logo inside widget */}
      <button className="chat-fab" onClick={() => { setIsOpen(o => !o); if (isOpen) stopSpeech() }}>
        {isOpen ? '✕' : (
          <div className="fab-text-content">
            <span className="fab-ask">Ask</span>
            <span className="fab-brand">OneVoice AI</span>
          </div>
        )}
      </button>
    </div>
  )
}
