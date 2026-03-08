import { useEffect, useRef } from 'react'
import TypingIndicator from './TypingIndicator'

export default function ChatMessages({ messages, loading }) {
  const bottomRef = useRef(null)
  
  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) 
  }, [messages, loading])
  
  return (
    <div className="chat-messages">
      {messages.map((msg, i) => (
        <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
          {msg.content}
        </div>
      ))}
      {loading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
