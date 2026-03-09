import { useEffect, useRef } from 'react'
import TypingIndicator from './TypingIndicator'

export default function ChatMessages({ messages, loading, onFeedback, typingText, isTyping }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading, typingText])

  return (
    <div className="chat-messages">
      {messages.map((msg, i) => (
        <div key={i}>
          <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
            {msg.content}
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