import { useState, useEffect } from 'react'
import ChatWidget from './components/ChatWidget'
import './styles/home.css'
import AdminDashboard from './components/AdminDashboard'

function InstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Never show if already running as an installed PWA
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (isInstalled) return

    // Show once per browser session — dismissed state resets when tab is closed
    if (sessionStorage.getItem('pwa_banner_dismissed')) return

    setVisible(true)

    // Listen for native prompt becoming available (for the Install button)
    const onReady = () => {} // just re-renders via window.__pwaPrompt check
    window.addEventListener('pwaready', onReady)
    window.addEventListener('appinstalled', () => {
      setVisible(false)
      window.__pwaPrompt = null
    })
    return () => window.removeEventListener('pwaready', onReady)
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_banner_dismissed', '1')
    setVisible(false)
  }

  const handleInstall = async () => {
    if (window.__pwaPrompt) {
      // Browser supports native install prompt
      window.__pwaPrompt.prompt()
      const { outcome } = await window.__pwaPrompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
        window.__pwaPrompt = null
      }
    } else {
      // Fallback: show manual instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        alert('To install on iPhone/iPad:\nTap the Share button (📤) at the bottom, then tap "Add to Home Screen"')
      } else {
        alert('To install:\n• Chrome / Edge: Look for the install icon (⊕) in the address bar and click it\n• Samsung Browser: Tap menu → Add page to → Home screen')
      }
    }
  }

  if (!visible) return null

  return (
    <div className="install-banner">
      <img src="/icon-192.png" alt="OneVoice" className="install-banner-logo" />
      <div className="install-banner-text">
        <span className="install-banner-title">📲 Install OneVoice</span>
        <span className="install-banner-sub">Add to home screen for quick access</span>
      </div>
      <button className="install-banner-btn" onClick={handleInstall}>Install</button>
      <button className="install-banner-dismiss" onClick={handleDismiss}>✕</button>
    </div>
  )
}

export default function App() {
  // Admin route — protected by Google OAuth inside AdminDashboard
  if (window.location.pathname === '/admin') {
    return <AdminDashboard />
  }

  // Students go straight to chatbot — no login needed
  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-inner">
          <div className="header-logo">
            <img src="/logo.jpeg" alt="Stanley College" className="logo-img" />
            <div>
              <div className="logo-title">Stanley College</div>
              <div className="logo-sub">of Engineering & Technology for Women</div>
            </div>
          </div>
          <nav className="header-nav">
            <a href="https://www.stanley.edu.in" target="_blank">Home</a>
            <a href="https://www.stanley.edu.in/courses-offered" target="_blank">Academics</a>
            <a href="https://www.stanley.edu.in/placements" target="_blank">Placements</a>
            <a href="https://stanleyexams.in" target="_blank">Exam Portal</a>
          </nav>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-badge">🎓 UGC Autonomous · NBA Accredited · NAAC A Grade</div>
          <h1 className="hero-title">Welcome to <span>Stanley College</span></h1>
          <p className="hero-subtitle">Empowering Women Through Excellence in Engineering & Technology since 2008</p>
          <div className="hero-buttons">
            <a href="https://www.stanley.edu.in" target="_blank" className="btn-primary">Visit Website</a>
            <a href="https://stanleyexams.in" target="_blank" className="btn-secondary">Exam Portal</a>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-inner">
          <div className="stat-card"><div className="stat-number">16.5 LPA</div><div className="stat-label">Highest Package</div></div>
          <div className="stat-card"><div className="stat-number">225+</div><div className="stat-label">Students Placed (2026)</div></div>
          <div className="stat-card"><div className="stat-number">7+</div><div className="stat-label">Branches Offered</div></div>
          <div className="stat-card"><div className="stat-number">NAAC A</div><div className="stat-label">Accreditation Grade</div></div>
        </div>
      </section>

      <section className="chatbot-info-section">
        <div className="chatbot-info-inner">
          <div className="chatbot-info-text">
            <div className="section-badge">🤖 AI-Powered Assistant</div>
            <h2>Meet <span>OneVoice</span></h2>
            <p>Your 24/7 multilingual student support chatbot powered by advanced AI.</p>
            <div className="feature-list">
              <div className="feature-item">🌐 5 Languages — English, Hindi, Urdu, Telugu, Tamil</div>
              <div className="feature-item">🎤 Voice Input — Speak your questions</div>
              <div className="feature-item">🔊 Voice Output — Listen to answers</div>
              <div className="feature-item">⚡ Instant Answers — No waiting, no queues</div>
              <div className="feature-item">📱 Mobile Friendly — Works on all devices</div>
              <div className="feature-item">🌙 Dark Mode — Easy on the eyes</div>
            </div>
            <div className="try-hint">👇 Click the chat bubble at the bottom right to get started!</div>
          </div>
          <div className="chatbot-info-image">
            <div className="info-card">
              <div className="info-card-header">💬 OneVoice Assistant</div>
              <div className="info-card-body">
                <div className="demo-msg bot">👋 Hi! I'm OneVoice. How can I help you today?</div>
                <div className="demo-msg user">What is the exam fee for BE B25?</div>
                <div className="demo-msg bot">The exam fee for BE (B25) I Semester is Rs.4250/- 📚</div>
              </div>
              <div className="info-card-langs"><span>EN</span><span>हि</span><span>اردو</span><span>తె</span><span>த</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="about-inner">
          <h2>About Stanley College</h2>
          <div className="about-grid">
            <div className="about-card"><div className="about-icon">🏛️</div><h3>Established 2008</h3><p>Located at Chapel Road, Abids, Hyderabad.</p></div>
            <div className="about-card"><div className="about-icon">🎓</div><h3>Programs Offered</h3><p>B.E, M.E, M.Tech, and MBA programs.</p></div>
            <div className="about-card"><div className="about-icon">🏆</div><h3>Accreditations</h3><p>NBA Accredited, NAAC Grade A, UGC Autonomous.</p></div>
            <div className="about-card"><div className="about-icon">💼</div><h3>Top Recruiters</h3><p>HSBC, UBS, Infosys and more recruit from campus.</p></div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <div className="footer-logo">Stanley College</div>
            <div className="footer-sub">of Engineering & Technology for Women (Autonomous)</div>
            <div className="footer-address">Chapel Road, Fateh Maidan, Abids, Hyderabad - 500001</div>
          </div>
          <div className="footer-right">
            <div>📞 040-23234880</div>
            <div>📧 hr@stanley.edu.in</div>
            <div>🌐 www.stanley.edu.in</div>
            <div>📝 stanleyexams.in</div>
          </div>
        </div>
        <div className="footer-bottom">© 2026 Stanley College · OneVoice AI Chatbot</div>
      </footer>

      {/* Students use chatbot directly — no login needed */}
      <ChatWidget />
      <InstallBanner />
    </div>
  )
}