import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const sendMessage = async (message, sessionId = null) => {
  const response = await axios.post(`${BASE_URL}/chat`, { message, session_id: sessionId })
  return response.data
}
