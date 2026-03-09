import { useState, useEffect } from 'react'
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

function speakText(text, language) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()

  const trySpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.85
    utterance.pitch = 1
    const voices = window.speechSynthesis.getVoices()

    const langMap = {
      english: ['en-IN', 'en-US', 'en-GB'],
      hindi: ['hi-IN', 'hi'],
      urdu: ['ur-PK', 'ur-IN', 'ur'],
      telugu: ['te-IN', 'te'],
      tamil: ['ta-IN', 'ta-SG', 'ta'],
    }

    const preferred = langMap[language] || ['en-IN']
    let matched = null

    for (const code of preferred) {
      matched = voices.find(v => v.lang === code) || voices.find(v => v.lang.startsWith(code.split('-')[0]))
      if (matched) break
    }

    if (matched) {
      utterance.voice = matched
      utterance.lang = matched.lang
    } else {
      // Fallback — use English voice but still speak the text
      utterance.lang = 'en-IN'
    }

    window.speechSynthesis.speak(utterance)
  }

  // Wait for voices to load if not ready
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      trySpeak()
      window.speechSynthesis.onvoiceschanged = null
    }
  } else {
    trySpeak()
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [language, setLanguage] = useState('english')
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
    }, 18)
  }

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    // Don't clear messages — keep history across language switches
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
          window.speechSynthesis.getVoices()
          setTimeout(() => speakText(finalText, language), 100)
        }
      })
    } catch (err) {
      setLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please visit www.stanley.edu.in" }])
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
    setMessages([{ role: 'assistant', content: WELCOME_MESSAGES[language] }])
    setSessionId(null)
    setShowSuggestions(true)
    localStorage.removeItem(STORAGE_KEY)
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
                  <div className="chat-subtitle">Stanley College · AI Assistant</div>
                </div>
              </div>
              <div className="header-actions">
                <button
                  className={`icon-btn ${voiceOutput ? 'active' : ''}`}
                  onClick={() => {
                    if (window.speechSynthesis.speaking) {
                      window.speechSynthesis.cancel()
                    } else {
                      setVoiceOutput(v => !v)
                    }
                  }}
                  title={window.speechSynthesis?.speaking ? 'Stop speaking' : voiceOutput ? 'Voice ON' : 'Voice OFF'}
                >🔊</button>
                <button
                  className="icon-btn"
                  onClick={() => setShowHistory(h => !h)}
                  title="Chat history"
                >📋</button>
                <button
                  className="icon-btn"
                  onClick={() => setDarkMode(d => !d)}
                  title="Dark mode"
                >{darkMode ? '☀️' : '🌙'}</button>
                <button
                  className="icon-btn"
                  onClick={() => setIsMaximized(m => !m)}
                  title="Maximize"
                >{isMaximized ? '⊡' : '⊞'}</button>
                <button
                  className="icon-btn"
                  onClick={clearHistory}
                  title="Clear history"
                >🗑️</button>
                <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
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
                    <span className="history-content">{msg.content.slice(0, 80)}{msg.content.length > 80 ? '...' : ''}</span>
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
      <button className="chat-fab" onClick={() => setIsOpen(o => !o)}>
        {isOpen ? '✕' : <img src="/logo.png" alt="OneVoice" className="fab-logo" />}
      </button>
    </div>
  )
}