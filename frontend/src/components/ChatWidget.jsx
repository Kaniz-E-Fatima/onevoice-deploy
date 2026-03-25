import { useState, useEffect, useRef } from 'react'
import { sendMessage } from '../services/api'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import '../styles/widget.css'
import { sendFeedback } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const LANGUAGES = [
  { code: 'english', label: 'EN' },
  { code: 'hindi', label: 'हि' },
  { code: 'urdu', label: 'اردو' },
  { code: 'telugu', label: 'తె' },
  { code: 'tamil', label: 'த' },
  { code: 'hinglish', label: 'Hinglish' },
  { code: 'telugish', label: 'Telugish' },
]

const SUGGESTIONS = [
  'Exam Fees 💰',
  'Timetable 📅',
  'Results 📊',
  'Placements 🏢',
  'Events 🎉',
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const WELCOME_MESSAGES = {
  english: `👋 ${getGreeting()}! I'm OneVoice, your Stanley College assistant. Ask me about exam fees, timetables, results, placements, or events!`,
  hindi: `👋 ${getGreeting()}! मैं OneVoice हूँ, आपका Stanley College सहायक। परीक्षा शुल्क, टाइमटेबल, परिणाम, या प्लेसमेंट के बारे में पूछें!`,
  urdu: `👋 ${getGreeting()}! میں OneVoice ہوں، آپ کا Stanley College اسسٹنٹ۔ امتحانی فیس، ٹائم ٹیبل، نتائج یا پلیسمنٹ کے بارے میں پوچھیں!`,
  telugu: `👋 ${getGreeting()}! నేను OneVoice, మీ Stanley College సహాయకుడిని. పరీక్ష రుసుములు, టైమ్‌టేబుల్, ఫలితాలు లేదా ప్లేస్‌మెంట్ గురించి అడగండి!`,
  tamil: `👋 ${getGreeting()}! நான் OneVoice, உங்கள் Stanley College உதவியாளர். தேர்வு கட்டணம், நேர அட்டவணை, முடிவுகள் அல்லது வேலைவாய்ப்பு பற்றி கேளுங்கள்!`,
}

const STORAGE_KEY = 'onevoice_chat_history'
const SETTINGS_KEY = 'onevoice_settings'

const LANG_CONFIG = {
  english: { codes: ['en-IN', 'en-US', 'en-GB'], bcp47: 'en-IN' },
  hindi: { codes: ['hi-IN', 'hi'], bcp47: 'hi-IN' },
  urdu: { codes: ['ur-PK', 'ur-IN', 'ur'], bcp47: 'ur-PK' },
  telugu: { codes: ['te-IN', 'te'], bcp47: 'te-IN' },
  tamil: { codes: ['ta-IN', 'ta-SG', 'ta'], bcp47: 'ta-IN' },
}

function findBestVoice(language) {
  const voices = window.speechSynthesis.getVoices()
  const config = LANG_CONFIG[language] || LANG_CONFIG.english
  for (const code of config.codes) {
    const v = voices.find(v => v.lang === code)
    if (v) return v
  }
  for (const code of config.codes) {
    const prefix = code.split('-')[0]
    const v = voices.find(v => v.lang.startsWith(prefix))
    if (v) return v
  }
  if (language === 'urdu') {
    const hindi = voices.find(v => v.lang.startsWith('hi'))
    if (hindi) return hindi
  }
  return voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en')) || voices[0] || null
}

function speakText(text, language) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.85
    utterance.pitch = 1.0
    utterance.volume = 1.0
    const voice = findBestVoice(language)
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang }
    else utterance.lang = LANG_CONFIG[language]?.bcp47 || 'en-IN'
    utterance.onerror = (e) => { if (e.error !== 'interrupted') console.warn('TTS:', e.error) }
    window.speechSynthesis.speak(utterance)
  }
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak() }
  } else { doSpeak() }
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

// ── Backend wake-up check ─────────────────────────────────────────────────────
async function checkBackendAwake() {
  try {
    const res = await fetch(`${API_URL.replace('/api', '')}/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch { return false }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [language, setLanguage] = useState('english')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [backendStatus, setBackendStatus] = useState('unknown') // 'unknown' | 'waking' | 'ready'
  const [wakeUpSeconds, setWakeUpSeconds] = useState(0)
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
  const wakeTimerRef = useRef(null)
  const [followUpSuggestions, setFollowUpSuggestions] = useState([])
  // ── Wake up backend when widget opens ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    if (backendStatus === 'ready') return

    setBackendStatus('waking')
    setWakeUpSeconds(0)

    // Start timer
    wakeTimerRef.current = setInterval(() => {
      setWakeUpSeconds(s => s + 1)
    }, 1000)

    // Poll until backend is awake
    const poll = async () => {
      for (let i = 0; i < 30; i++) {
        const awake = await checkBackendAwake()
        if (awake) {
          setBackendStatus('ready')
          clearInterval(wakeTimerRef.current)
          return
        }
        await new Promise(r => setTimeout(r, 3000))
      }
      // After 90s give up and let user try anyway
      setBackendStatus('ready')
      clearInterval(wakeTimerRef.current)
    }
    poll()

    return () => clearInterval(wakeTimerRef.current)
  }, [isOpen])

  // ── Keep-alive ping every 10 mins ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await fetch(`${API_URL.replace('/api', '')}/ping`, { signal: AbortSignal.timeout(5000) })
      } catch { }
    }, 600000) // 10 minutes
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!window.speechSynthesis) return
    const interval = setInterval(() => setIsSpeaking(!!window.speechSynthesis.speaking), 250)
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
    setFollowUpSuggestions([])
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const data = await sendMessage(text, sessionId, language)
      setSessionId(data.session_id)
      setLoading(false)
      typeMessage(data.reply, (finalText) => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: finalText,
          showFeedback: true,
          dbIndex: data.bot_message_db_index  // ✅ store exact DB index
        }])
      } catch (err) {
        setLoading(false)
        // ✅ Save error message to DB so feedback can be recorded
        try {
          const API_URL = import.meta.env.VITE_API_URL || '/api'
          const errorMsg = "Sorry, I'm having trouble connecting. Please try again in a moment or visit www.stanley.edu.in"
          const res = await fetch(`${API_URL}/chat/error`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, message: text, error_reply: errorMsg })
          })
          const data = await res.json()
          setSessionId(data.session_id)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: errorMsg,
            showFeedback: true,
            dbIndex: data.bot_message_db_index
          }])
        } catch {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Sorry, I'm having trouble connecting. Please try again in a moment or visit www.stanley.edu.in"
          }])
        }
      }
    }

  const handleSuggestion = (suggestion) => handleSend(suggestion.replace(/[💰📅📊🏢🎉]/g, '').trim())

    const handleFeedback = async (index, type) => {
      const msg = messages[index]
      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, feedback: type, showFeedback: false } : m
      ))
      // ✅ Use DB index stored in message, not React array index
      if (sessionId && msg?.dbIndex !== undefined) {
        try {
          await sendFeedback(sessionId, msg.dbIndex, type)
        } catch (e) { console.error('Feedback error:', e) }
      }
    }

    const clearHistory = () => {
      stopSpeech()
      setMessages([{ role: 'assistant', content: WELCOME_MESSAGES[language] }])
      setSessionId(null)
      setShowSuggestions(true)
      localStorage.removeItem(STORAGE_KEY)
    }

    const handleVoiceToggle = () => {
      if (isSpeaking) { stopSpeech(); setIsSpeaking(false) }
      else setVoiceOutput(v => !v)
    }

    return (
      <div className={`chat-widget-container ${darkMode ? 'dark' : ''} ${isMaximized ? 'maximized' : ''}`}>
        {isOpen && (
          <div className="chat-window">
            <div className="chat-header">
              <div className="chat-header-top">
                <div className="chat-header-info">
                  <img src="/logo.png" alt="SC" className="chat-avatar" />
                  <div>
                    <div className="chat-title">OneVoice</div>
                    <div className="chat-subtitle">
                      Stanley College · AI Assistant
                      {backendStatus === 'waking' && (
                        <span className="waking-badge"> · ⏳ Starting up...</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="header-actions">
                  <button
                    className={`icon-btn ${voiceOutput ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
                    onClick={handleVoiceToggle}
                    title={isSpeaking ? 'Stop speaking' : voiceOutput ? 'Voice ON' : 'Voice OFF'}
                  >{isSpeaking ? '⏹' : '🔊'}</button>
                  <button className="icon-btn" onClick={() => setShowHistory(h => !h)} title="History">📋</button>
                  <button className="icon-btn" onClick={() => setDarkMode(d => !d)}>
                    {darkMode ? '☀️' : '🌙'}
                  </button>
                  <button className="icon-btn" onClick={() => setIsMaximized(m => !m)}>
                    {isMaximized ? '⊡' : '⊞'}
                  </button>
                  <button className="icon-btn" onClick={clearHistory} title="Clear">🗑️</button>
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

            {/* Wake-up screen */}
            {backendStatus === 'waking' ? (
              <div className="waking-screen">
                <div className="waking-spinner" />
                <div className="waking-title">Starting OneVoice...</div>
                <div className="waking-sub">
                  Our server is waking up. This takes about 30 seconds on first visit.
                </div>
                <div className="waking-timer">{wakeUpSeconds}s</div>
                <div className="waking-tip">☕ Just a moment while we get ready for you!</div>
              </div>
            ) : showHistory ? (
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
                  language={language}
                />
                {showSuggestions && (
                  <div className="suggestions">
                    {SUGGESTIONS.map(s => (
                      <button key={s} className="suggestion-btn" onClick={() => handleSuggestion(s)}>{s}</button>
                    ))}
                  </div>
                )}
                {/* ✅ Follow-up suggestions after bot reply */}
                {!showSuggestions && followUpSuggestions.length > 0 && (
                  <div className="suggestions">
                    {followUpSuggestions.map((s, i) => (
                      <button key={i} className="suggestion-btn"
                        onClick={() => { setFollowUpSuggestions([]); handleSend(s) }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <ChatInput onSend={handleSend} loading={loading || isTyping} language={language} />
              </>
            )}
          </div>
        )}

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
