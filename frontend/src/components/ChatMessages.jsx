import { useEffect, useRef, useState } from 'react'
import TypingIndicator from './TypingIndicator'

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
  return voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en')) || voices[0] || null
}

function speakText(text, language, onStart, onEnd) {
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
    utterance.onstart = onStart
    utterance.onend = onEnd
    utterance.onerror = (e) => { if (e.error !== 'interrupted') { onEnd && onEnd() } }
    window.speechSynthesis.speak(utterance)
  }
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      doSpeak()
    }
  } else { doSpeak() }
}

function SpeakButton({ text, language }) {
  const [speaking, setSpeaking] = useState(false)

  const handleClick = () => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    } else {
      speakText(
        text, language,
        () => setSpeaking(true),
        () => setSpeaking(false)
      )
    }
  }

  return (
    <button
      onClick={handleClick}
      title={speaking ? 'Stop speaking' : 'Read aloud'}
      style={{
        background: speaking ? '#8B0000' : 'none',
        border: `1px solid ${speaking ? '#8B0000' : '#e0e0e0'}`,
        borderRadius: '50%',
        width: 26,
        height: 26,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: speaking ? 'white' : '#999',
        transition: 'all 0.18s',
        marginLeft: 6,
        flexShrink: 0,
        animation: speaking ? 'speakPulse 1s infinite' : 'none'
      }}
    >
      {speaking ? '⏹' : '🔊'}
    </button>
  )
}

export default function ChatMessages({ messages, loading, onFeedback, typingText, isTyping, language }) {
  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, typingText])

  return (
    <div className="chat-messages">
      {messages.map((msg, i) => (
        <div key={i}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 4,
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}
              style={{ margin: 0 }}>
              {msg.content}
            </div>
            {/* ✅ Speaker button on every bot message */}
            {msg.role !== 'user' && (
              <SpeakButton text={msg.content} language={language || 'english'} />
            )}
          </div>
          {msg.showFeedback && (
            <div className="feedback-row">
              <button className="feedback-btn" onClick={() => onFeedback(i, 'up')}>👍 Helpful</button>
              <button className="feedback-btn" onClick={() => onFeedback(i, 'down')}>👎 Not helpful</button>
            </div>
          )}
          {msg.feedback && (
            <div className="feedback-thanks">
              {msg.feedback === 'up' ? '✅ Thanks for your feedback!' : '🙏 Sorry! We\'ll improve.'}
            </div>
          )}
        </div>
      ))}
      {loading && <TypingIndicator />}
      {isTyping && typingText && (
        <div className="chat-bubble bot typing-text">
          {typingText}<span className="cursor">|</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}