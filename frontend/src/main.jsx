import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Capture beforeinstallprompt BEFORE React mounts — it fires very early
window.__pwaPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__pwaPrompt = e
  // Dispatch a custom event so any already-mounted component can react
  window.dispatchEvent(new Event('pwaready'))
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW failed'))
  })
}