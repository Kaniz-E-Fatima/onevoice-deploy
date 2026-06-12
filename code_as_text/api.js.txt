import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const sendMessage = async (message, sessionId = null, language = 'english', token = null) => {
  const response = await axios.post(`${BASE_URL}/chat`, {
    message,
    session_id: sessionId,
    language,
    token
  })
  return response.data
}

export async function sendFeedback(sessionId, dbMessageIndex, feedback) {
  const API_URL = import.meta.env.VITE_API_URL || '/api'
  const res = await fetch(`${API_URL}/chat/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      message_index: dbMessageIndex,
      feedback
    })
  })
  return res.json()
}