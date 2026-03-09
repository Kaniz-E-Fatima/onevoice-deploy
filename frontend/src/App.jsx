import ChatWidget from './components/ChatWidget'
import './styles/home.css'
import AdminDashboard from './components/AdminDashboard'

export default function App() {
  // Add this at the top of the component:
  if (window.location.pathname === '/admin') {
    return <AdminDashboard />
  }

  return (
    // ... your existing JSX
  )
}

export default function App() {
  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="header-inner">
          <div className="header-logo">
            <img src="/logo.png" alt="Stanley College" className="logo-img" />
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

      {/* Hero Section */}
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

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-inner">
          <div className="stat-card">
            <div className="stat-number">16.5 LPA</div>
            <div className="stat-label">Highest Package</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">225+</div>
            <div className="stat-label">Students Placed (2026)</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">7+</div>
            <div className="stat-label">Branches Offered</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">NAAC A</div>
            <div className="stat-label">Accreditation Grade</div>
          </div>
        </div>
      </section>

      {/* OneVoice Info Section */}
      <section className="chatbot-info-section">
        <div className="chatbot-info-inner">
          <div className="chatbot-info-text">
            <div className="section-badge">🤖 AI-Powered Assistant</div>
            <h2>Meet <span>OneVoice</span></h2>
            <p>Your 24/7 multilingual student support chatbot powered by advanced AI. Get instant answers about exam fees, timetables, results, placements, and college events — in your preferred language.</p>
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
                <div className="demo-msg bot">The exam fee for BE (B25) I Semester is Rs.4250/- including one-time exam expenses. Pay at stanleyexams.in 📚</div>
                <div className="demo-msg user">टाइमटेबल कब है?</div>
                <div className="demo-msg bot">BE III Sem परीक्षाएं 31 दिसंबर से शुरू होती हैं। 📅</div>
              </div>
              <div className="info-card-langs">
                <span>EN</span><span>हि</span><span>اردو</span><span>తె</span><span>த</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="about-inner">
          <h2>About Stanley College</h2>
          <div className="about-grid">
            <div className="about-card">
              <div className="about-icon">🏛️</div>
              <h3>Established 2008</h3>
              <p>Located at Chapel Road, Abids, Hyderabad. Affiliated to Osmania University and approved by AICTE.</p>
            </div>
            <div className="about-card">
              <div className="about-icon">🎓</div>
              <h3>Programs Offered</h3>
              <p>B.E, M.E, M.Tech, and MBA programs across CSE, ECE, EEE, IT, AIML, AI&DS, and CME branches.</p>
            </div>
            <div className="about-card">
              <div className="about-icon">🏆</div>
              <h3>Accreditations</h3>
              <p>NBA Accredited, NAAC Grade A, UGC Autonomous Institution with world-class facilities.</p>
            </div>
            <div className="about-card">
              <div className="about-icon">💼</div>
              <h3>Top Recruiters</h3>
              <p>HSBC, UBS, Deccan AI, Alstom, Infosys, Purview, and Savantis HCL recruit from our campus.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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

      <ChatWidget />
    </div>
  )
}