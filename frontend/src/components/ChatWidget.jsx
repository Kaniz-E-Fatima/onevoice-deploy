import { useState } from 'react'
import { sendMessage } from '../services/api'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import '../styles/widget.css'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: "👋 Hi! I'm OneVoice, your Stanley College assistant. Ask me about exam fees, timetables, results, placements, or anything else!" }])
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSend = async (text) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    
    try {
      const data = await sendMessage(text, sessionId)
      setSessionId(data.session_id)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again or visit www.stanley.edu.in" }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">SC</div>
              <div>
                <div className="chat-title">OneVoice</div>
                <div className="chat-subtitle">Stanley College · Ask me anything</div>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <ChatMessages messages={messages} loading={loading} />
          <ChatInput onSend={handleSend} loading={loading} />
        </div>
      )}
      <button className="chat-fab" onClick={() => setIsOpen(o => !o)}>{isOpen ? '✕' : '💬'}</button>
    </div>
  )
}
