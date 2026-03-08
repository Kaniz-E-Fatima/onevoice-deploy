import { useState } from 'react'

export default function ChatInput({ onSend, loading }) {
  const [text, setText] = useState('')
  
  const handleSubmit = () => { 
    if (!text.trim() || loading) return; 
    onSend(text); 
    setText('') 
  }
  
  const handleKey = (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
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
        placeholder="Ask about fees, timetables, results..." 
        disabled={loading} 
      />
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
