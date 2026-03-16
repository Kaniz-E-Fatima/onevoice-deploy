import { useState, useEffect } from 'react'
import '../styles/admin.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const BACKEND_URL = API_URL.replace('/api', '')

const safe = (val, fallback = '—') => {
    if (val === null || val === undefined) return fallback
    if (typeof val === 'string') return val || fallback
    if (typeof val === 'number') return String(val)
    return fallback
}

function timeAgo(dateStr) {
    if (!dateStr) return '—'
    try {
        const diff = Date.now() - new Date(dateStr).getTime()
        const m = Math.floor(diff / 60000)
        if (m < 1) return 'just now'
        if (m < 60) return `${m}m ago`
        const h = Math.floor(m / 60)
        if (h < 24) return `${h}h ago`
        return `${Math.floor(h / 24)}d ago`
    } catch { return '—' }
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    } catch { return '—' }
}

const LANG_FLAGS = { english: '🇬🇧', hindi: '🇮🇳', urdu: '🇵🇰', telugu: '🟡', tamil: '🟠' }
const LANG_COLORS = { english: '#1d4ed8', hindi: '#b45309', urdu: '#047857', telugu: '#7c3aed', tamil: '#be123c' }

function StatCard({ icon, label, value, color }) {
    return (
        <div className="adm-stat-card" style={{ borderLeftColor: color || '#8B0000' }}>
            <div className="adm-stat-icon">{icon}</div>
            <div className="adm-stat-number">{value ?? '—'}</div>
            <div className="adm-stat-label">{label}</div>
        </div>
    )
}

function SessionRow({ session, onClick, active }) {
    const lang = typeof session.language === 'string' ? session.language : 'english'
    const msgCount = Array.isArray(session.messages) ? session.messages.length : 0
    return (
        <div className={`adm-session-row ${active ? 'active' : ''}`} onClick={() => onClick(session)}>
            <div className="adm-session-left">
                <div className="adm-session-avatar">{LANG_FLAGS[lang] || '🌐'}</div>
                <div>
                    <div className="adm-session-id">...{safe(session._id)?.slice(-10)}</div>
                    <div className="adm-session-meta">{lang} · {msgCount} msgs</div>
                </div>
            </div>
            <div className="adm-session-time">{timeAgo(session.updated_at)}</div>
        </div>
    )
}

function MsgBubble({ msg }) {
    const isUser = msg.role === 'user'
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    return (
        <div className={`adm-bubble-wrap ${isUser ? 'user' : 'bot'}`}>
            <div className={`adm-bubble ${isUser ? 'user' : 'bot'}`}>
                <div className="adm-bubble-role">{isUser ? '👤 Student' : '🤖 OneVoice'}</div>
                <div>{content}</div>
                {msg.timestamp && (
                    <div className="adm-bubble-time">
                        {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>
        </div>
    )
}

function LangBar({ lang, count, total }) {
    return (
        <div className="adm-lang-bar-row">
            <div className="adm-lang-bar-label">{lang}</div>
            <div className="adm-lang-bar-track">
                <div className="adm-lang-bar-fill" style={{
                    width: `${(count / total) * 100}%`,
                    background: LANG_COLORS[lang] || '#8B0000'
                }} />
            </div>
            <div className="adm-lang-bar-count">{count}</div>
        </div>
    )
}

function PDFManager({ adminKey, API_URL }) {
    const [files, setFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const pdfHeaders = { 'X-Admin-Key': adminKey }

    const fetchFiles = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_URL}/admin/pdfs`, { headers: pdfHeaders })
            if (res.ok) {
                const data = await res.json()
                setFiles(data.files || [])
            } else {
                setError(`Failed to load files (${res.status})`)
            }
        } catch (e) {
            setError('Cannot connect to backend')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchFiles() }, [])

    const handleUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setUploading(true)
        setMessage('')
        const formData = new FormData()
        formData.append('file', file)
        try {
            const res = await fetch(`${API_URL}/admin/pdfs/upload`, {
                method: 'POST',
                headers: pdfHeaders,
                body: formData
            })
            const data = await res.json()
            setMessage(res.ok ? `✅ ${data.message}` : `❌ ${data.detail}`)
            if (res.ok) fetchFiles()
        } catch (e) {
            setMessage('❌ Upload failed. Try again.')
        }
        setUploading(false)
        e.target.value = ''
    }

    const handleDelete = async (filename) => {
        if (!window.confirm(`Delete ${filename}?`)) return
        try {
            const res = await fetch(`${API_URL}/admin/pdfs/${encodeURIComponent(filename)}`, {
                method: 'DELETE',
                headers: pdfHeaders
            })
            const data = await res.json()
            setMessage(res.ok ? `✅ ${data.message}` : `❌ ${data.detail}`)
            if (res.ok) fetchFiles()
        } catch (e) {
            setMessage('❌ Delete failed.')
        }
    }

    return (
        <div>
            <div className="adm-card" style={{ marginBottom: '1.5rem' }}>
                <div className="adm-card-title">📤 Upload New PDF or TXT</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <label style={{
                        background: '#8B0000', color: 'white',
                        padding: '10px 24px', borderRadius: '8px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontWeight: 600, fontSize: '0.9rem',
                        opacity: uploading ? 0.7 : 1
                    }}>
                        {uploading ? '⏳ Uploading...' : '📁 Choose File'}
                        <input type="file" accept=".pdf,.txt"
                            onChange={handleUpload}
                            style={{ display: 'none' }}
                            disabled={uploading} />
                    </label>
                    <span style={{ color: '#666', fontSize: '0.85rem' }}>Supported: PDF, TXT</span>
                </div>
                {message && (
                    <div style={{
                        marginTop: '1rem', padding: '10px 16px',
                        background: message.startsWith('✅') ? '#f0fff4' : '#fff0f0',
                        border: `1px solid ${message.startsWith('✅') ? '#86efac' : '#fca5a5'}`,
                        borderRadius: '8px', fontSize: '0.9rem',
                        color: message.startsWith('✅') ? '#166534' : '#991b1b'
                    }}>
                        {message}
                    </div>
                )}
            </div>
            <div className="adm-card">
                <div className="adm-card-title">
                    📂 Knowledge Base Files
                    <button onClick={fetchFiles} style={{
                        marginLeft: '1rem', background: 'none', border: '1px solid #ddd',
                        borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem'
                    }}>🔄 Refresh</button>
                </div>
                {error && (
                    <div style={{ color: '#dc2626', padding: '1rem', fontSize: '0.9rem' }}>
                        ❌ {error} — <button onClick={fetchFiles} style={{ color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
                    </div>
                )}
                {loading ? (
                    <div className="adm-loading"><div className="adm-spinner" />Loading files...</div>
                ) : files.length === 0 && !error ? (
                    <div className="adm-empty">No files uploaded yet. Upload your first PDF above!</div>
                ) : (
                    <div style={{ marginTop: '1rem' }}>
                        {files.map((file, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', borderRadius: '8px', marginBottom: '8px',
                                background: '#f9f9f9', border: '1px solid #eee'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{file.file_type === 'pdf' ? '📄' : '📝'}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{file.filename}</div>
                                        <div style={{ color: '#888', fontSize: '0.8rem' }}>
                                            {file.size_kb} KB · {(file.file_type || 'txt').toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <label style={{
                                        background: '#1d4ed8', color: 'white',
                                        padding: '6px 14px', borderRadius: '6px',
                                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                                    }}>
                                        🔄 Replace
                                        <input type="file" accept=".pdf,.txt"
                                            onChange={handleUpload}
                                            style={{ display: 'none' }} />
                                    </label>
                                    <button onClick={() => handleDelete(file.filename)} style={{
                                        background: '#dc2626', color: 'white', border: 'none',
                                        padding: '6px 14px', borderRadius: '6px',
                                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                                    }}>🗑️ Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function AdminDashboard() {
    // ✅ ALL useState hooks at the top
    const [isAuth, setIsAuth] = useState(false)
    const [admin, setAdmin] = useState(null)
    const [authError, setAuthError] = useState(false)
    const [analytics, setAnalytics] = useState(null)
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [selectedSession, setSelectedSession] = useState(null)
    const [search, setSearch] = useState('')
    const [feedback, setFeedback] = useState(null)  // ✅ MOVED HERE

    const getHeaders = () => {
        const token = localStorage.getItem('admin_token')
        return { 'X-Admin-Key': 'stanley2025', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')
        const error = params.get('error')
        if (error === 'unauthorized') {
            setAuthError(true)
            window.history.replaceState({}, '', '/admin')
            return
        }
        if (token) {
            localStorage.setItem('admin_token', token)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setAdmin(payload)
                setIsAuth(true)
                window.history.replaceState({}, '', '/admin')
            } catch { setAuthError(true) }
        } else {
            const saved = localStorage.getItem('admin_token')
            if (saved) {
                try {
                    const payload = JSON.parse(atob(saved.split('.')[1]))
                    if (payload.exp * 1000 > Date.now()) {
                        setAdmin(payload)
                        setIsAuth(true)
                    } else { localStorage.removeItem('admin_token') }
                } catch { localStorage.removeItem('admin_token') }
            }
        }
    }, [])

    useEffect(() => { if (isAuth) fetchData() }, [isAuth])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [aRes, sRes, fRes] = await Promise.all([
                fetch(`${API_URL}/analytics/summary`, { headers: getHeaders() }),
                fetch(`${API_URL}/admin/sessions`, { headers: getHeaders() }),
                fetch(`${API_URL}/admin/feedback`, { headers: getHeaders() })
            ])
            if (aRes.ok) setAnalytics(await aRes.json())
            if (sRes.ok) {
                const data = await sRes.json()
                const raw = Array.isArray(data) ? data : (data.sessions || [])
                setSessions(raw)
            }
            if (fRes.ok) setFeedback(await fRes.json())
        } catch (e) { console.error('fetchData error:', e) }
        finally { setLoading(false) }
    }

    const handleRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }

    const handleLogout = () => {
        localStorage.removeItem('admin_token')
        setIsAuth(false)
        setAdmin(null)
    }

    const handleExportCSV = () => {
        fetch(`${API_URL}/admin/export/csv`, { headers: getHeaders() })
            .then(r => r.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'onevoice_sessions.csv'
                link.click()
                URL.revokeObjectURL(url)
            })
    }

    const handleDeleteSession = async (sessionId) => {
        if (!window.confirm('Delete this session?')) return
        const res = await fetch(`${API_URL}/admin/sessions/${sessionId}`, {
            method: 'DELETE', headers: getHeaders()
        })
        if (res.ok) {
            setSelectedSession(null)
            fetchData()
        }
    }

    const totalMessages = sessions.reduce((a, s) => {
        return a + (Array.isArray(s.messages) ? s.messages.length : 0)
    }, 0)

    const todaySessions = sessions.filter(s => {
        try { return s.updated_at && new Date(s.updated_at).toDateString() === new Date().toDateString() }
        catch { return false }
    }).length

    const langCounts = sessions.reduce((acc, s) => {
        const l = typeof s.language === 'string' && s.language ? s.language : 'english'
        acc[l] = (acc[l] || 0) + 1
        return acc
    }, {})

    const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const avgMsgs = sessions.length ? Math.round((totalMessages / sessions.length) * 10) / 10 : 0

    const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d })
    const dayCounts = last7.map(d => sessions.filter(s => {
        try { return s.updated_at && new Date(s.updated_at).toDateString() === d.toDateString() }
        catch { return false }
    }).length)
    const maxDay = Math.max(...dayCounts, 1)

    const filtered = sessions.filter(s =>
        !search ||
        safe(s._id, '').toLowerCase().includes(search.toLowerCase()) ||
        safe(s.language, '').toLowerCase().includes(search.toLowerCase())
    )

    if (!isAuth) {
        return (
            <div className="adm-login-bg">
                <div className="adm-login-card">
                    <img src="/logo.png" alt="Stanley College" className="adm-login-logo" />
                    <h2 className="adm-login-title">OneVoice Admin</h2>
                    <p className="adm-login-sub">Stanley College · Secure Dashboard</p>
                    {authError && (
                        <div style={{
                            background: '#fff0f0', border: '1px solid #ffcccc',
                            borderRadius: '8px', padding: '10px', marginBottom: '1rem',
                            color: '#cc0000', fontSize: '0.85rem', textAlign: 'center'
                        }}>
                            ⛔ Access denied. Only authorized admins can login.
                        </div>
                    )}
                    <button className="adm-login-btn"
                        onClick={() => window.location.href = `${BACKEND_URL}/auth/google`}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                        <img src="https://developers.google.com/identity/images/g-logo.png"
                            alt="Google" width="20"
                            style={{ background: 'white', borderRadius: '2px', padding: '2px' }} />
                        Sign in with Google
                    </button>
                    <div className="adm-login-hint">Only authorized college admins can access this panel</div>
                </div>
            </div>
        )
    }

    return (
        <div className="adm-root">
            <header className="adm-header">
                <div className="adm-header-left">
                    <img src="/logo.png" alt="SC" className="adm-header-logo" />
                    <div>
                        <div className="adm-header-title">OneVoice Admin Dashboard</div>
                        <div className="adm-header-sub">Stanley College · Analytics & Insights</div>
                    </div>
                </div>
                <div className="adm-header-right">
                    {admin && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={admin.picture} alt={admin.name}
                                style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #8B0000' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{admin.name}</span>
                        </div>
                    )}
                    <span className="adm-live-badge">🟢 Live</span>
                    <button className="adm-btn-refresh" onClick={handleRefresh} disabled={refreshing}>
                        {refreshing ? '⏳' : '🔄'} Refresh
                    </button>
                    <button className="adm-btn-logout" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <div className="adm-tabs">
                {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'sessions', label: '💬 Sessions' },
                    { id: 'analytics', label: '📈 Analytics' },
                    { id: 'languages', label: '🌐 Languages' },
                    { id: 'pdfs', label: '📁 PDFs' },
                    { id: 'feedback', label: '⭐ Feedback' },
                ].map(t => (
                    <button key={t.id}
                        className={`adm-tab ${activeTab === t.id ? 'active' : ''}`}
                        onClick={() => { setActiveTab(t.id); setSelectedSession(null) }}
                    >{t.label}</button>
                ))}
            </div>

            <div className="adm-content">
                {loading ? (
                    <div className="adm-loading"><div className="adm-spinner" />Loading data...</div>
                ) : (
                    <>
                        {activeTab === 'overview' && (
                            <>
                                <div className="adm-stats-grid">
                                    <StatCard icon="👥" label="Total Sessions" value={analytics?.total_sessions ?? sessions.length} color="#8B0000" />
                                    <StatCard icon="💬" label="Total Messages" value={analytics?.total_queries ?? totalMessages} color="#1d4ed8" />
                                    <StatCard icon="📅" label="Today's Sessions" value={todaySessions} color="#047857" />
                                    <StatCard icon="⚡" label="Avg Msgs / Session" value={avgMsgs} color="#b45309" />
                                </div>
                                <div className="adm-two-col">
                                    <div className="adm-card">
                                        <div className="adm-card-title">🕐 Recent Sessions</div>
                                        {sessions.length === 0
                                            ? <div className="adm-empty">No sessions yet!</div>
                                            : sessions.slice(0, 6).map((s, i) => (
                                                <SessionRow key={s._id || i} session={s} active={false}
                                                    onClick={() => { setSelectedSession(s); setActiveTab('sessions') }} />
                                            ))
                                        }
                                    </div>
                                    <div className="adm-card">
                                        <div className="adm-card-title">🌐 Language Breakdown</div>
                                        {Object.keys(langCounts).length === 0
                                            ? <div className="adm-empty">No data yet</div>
                                            : Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                                                <LangBar key={lang} lang={lang} count={count} total={sessions.length} />
                                            ))
                                        }
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'sessions' && (
                            <div className="adm-sessions-layout">
                                <div className="adm-sessions-list-panel">
                                    <input className="adm-search"
                                        placeholder="🔍 Search by ID or language..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)} />
                                    <div className="adm-session-count-label">{filtered.length} sessions</div>
                                    {filtered.length === 0
                                        ? <div className="adm-empty">No sessions found</div>
                                        : filtered.map((s, i) => (
                                            <div key={s._id || i} style={{ position: 'relative' }}>
                                                <SessionRow session={s}
                                                    active={selectedSession?._id === s._id}
                                                    onClick={setSelectedSession} />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(s._id) }}
                                                    style={{
                                                        position: 'absolute', right: '8px', top: '50%',
                                                        transform: 'translateY(-50%)', background: '#dc2626',
                                                        color: 'white', border: 'none', borderRadius: '4px',
                                                        padding: '2px 8px', fontSize: '0.7rem', cursor: 'pointer'
                                                    }}>
                                                    🗑️
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                                <div className="adm-session-detail-panel">
                                    {!selectedSession ? (
                                        <div className="adm-detail-placeholder">
                                            <div style={{ fontSize: 48 }}>💬</div>
                                            <div>Select a session to view messages</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="adm-detail-header">
                                                <div>
                                                    <div className="adm-detail-id">{safe(selectedSession._id)}</div>
                                                    <div className="adm-detail-meta">
                                                        {LANG_FLAGS[selectedSession.language] || '🌐'} {safe(selectedSession.language, 'english')} ·{' '}
                                                        {Array.isArray(selectedSession.messages) ? selectedSession.messages.length : 0} messages ·{' '}
                                                        {timeAgo(selectedSession.updated_at)}
                                                    </div>
                                                </div>
                                                <button className="adm-close-btn" onClick={() => setSelectedSession(null)}>✕</button>
                                            </div>
                                            <div className="adm-messages-area">
                                                {Array.isArray(selectedSession.messages) && selectedSession.messages.length > 0
                                                    ? selectedSession.messages.map((msg, i) => <MsgBubble key={i} msg={msg} />)
                                                    : <div className="adm-empty">No messages stored yet.</div>
                                                }
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'analytics' && (
                            <>
                                <div className="adm-stats-grid">
                                    <StatCard icon="👥" label="Total Sessions" value={sessions.length} color="#8B0000" />
                                    <StatCard icon="💬" label="Total Messages" value={totalMessages} color="#1d4ed8" />
                                    <StatCard icon="📊" label="Avg Msgs / Session" value={avgMsgs} color="#b45309" />
                                    <StatCard icon="🌐" label="Top Language" value={topLang} color="#047857" />
                                </div>
                                <div className="adm-card">
                                    <div className="adm-card-title">📅 Sessions — Last 7 Days</div>
                                    <div className="adm-bar-chart">
                                        {last7.map((d, i) => (
                                            <div key={i} className="adm-bar-col">
                                                <div className="adm-bar-val">{dayCounts[i]}</div>
                                                <div className="adm-bar" style={{ height: `${(dayCounts[i] / maxDay) * 100}%` }} />
                                                <div className="adm-bar-day">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="adm-card">
                                    <div className="adm-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>📋 Session Log</span>
                                        <button onClick={handleExportCSV} style={{
                                            background: '#047857', color: 'white', border: 'none',
                                            padding: '6px 16px', borderRadius: '6px',
                                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                                        }}>📥 Export CSV</button>
                                    </div>
                                    <div className="adm-table-wrap">
                                        <table className="adm-table">
                                            <thead>
                                                <tr>
                                                    <th>Session ID</th><th>Language</th><th>Messages</th><th>Created</th><th>Last Active</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sessions.slice(0, 25).map((s, i) => (
                                                    <tr key={s._id || i} className="adm-table-row"
                                                        onClick={() => { setSelectedSession(s); setActiveTab('sessions') }}>
                                                        <td className="adm-table-id">...{safe(s._id, '').slice(-12)}</td>
                                                        <td style={{ textTransform: 'capitalize' }}>{safe(s.language, 'english')}</td>
                                                        <td>{Array.isArray(s.messages) ? s.messages.length : 0}</td>
                                                        <td className="adm-muted">{formatDate(s.created_at)}</td>
                                                        <td className="adm-muted">{timeAgo(s.updated_at)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {sessions.length === 0 && <div className="adm-empty">No sessions yet</div>}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'languages' && (
                            <>
                                <div className="adm-stats-grid">
                                    {Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                                        <StatCard key={lang}
                                            icon={LANG_FLAGS[lang] || '🌐'}
                                            label={lang.charAt(0).toUpperCase() + lang.slice(1)}
                                            value={`${count} sessions`}
                                            color={LANG_COLORS[lang] || '#8B0000'} />
                                    ))}
                                    {Object.keys(langCounts).length === 0 && <div className="adm-empty">No data yet</div>}
                                </div>
                                <div className="adm-card">
                                    <div className="adm-card-title">🌐 Detailed Language Usage</div>
                                    {Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                                        <div key={lang} className="adm-lang-detail-row">
                                            <div className="adm-lang-flag">{LANG_FLAGS[lang] || '🌐'}</div>
                                            <div className="adm-lang-name">{lang.charAt(0).toUpperCase() + lang.slice(1)}</div>
                                            <div className="adm-lang-bar-wrap">
                                                <div className="adm-lang-bar" style={{
                                                    width: `${Math.round((count / sessions.length) * 100)}%`,
                                                    background: LANG_COLORS[lang] || '#8B0000'
                                                }} />
                                            </div>
                                            <div className="adm-lang-pct">{Math.round((count / sessions.length) * 100)}%</div>
                                            <div className="adm-lang-count">{count} sessions</div>
                                        </div>
                                    ))}
                                    {Object.keys(langCounts).length === 0 && (
                                        <div className="adm-empty">No language data yet!</div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'feedback' && (
                            <>
                                <div className="adm-stats-grid">
                                    <StatCard icon="📊" label="Total Feedback" value={feedback?.total_feedback ?? 0} color="#8B0000" />
                                    <StatCard icon="👍" label="Thumbs Up" value={feedback?.thumbs_up ?? 0} color="#047857" />
                                    <StatCard icon="👎" label="Thumbs Down" value={feedback?.thumbs_down ?? 0} color="#dc2626" />
                                    <StatCard icon="⭐" label="Satisfaction Rate" value={`${feedback?.satisfaction_rate ?? 0}%`} color="#b45309" />
                                </div>
                                <div className="adm-card">
                                    <div className="adm-card-title">📈 Student Satisfaction</div>
                                    {!feedback || feedback.total_feedback === 0 ? (
                                        <div className="adm-empty">No feedback collected yet. Feedback appears after students rate responses.</div>
                                    ) : (
                                        <div style={{ padding: '1rem' }}>
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ fontWeight: 600 }}>👍 Positive</span>
                                                    <span>{feedback.thumbs_up} responses</span>
                                                </div>
                                                <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '12px' }}>
                                                    <div style={{
                                                        width: `${feedback.satisfaction_rate}%`,
                                                        background: '#047857', height: '12px',
                                                        borderRadius: '999px', transition: 'width 0.5s'
                                                    }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ fontWeight: 600 }}>👎 Negative</span>
                                                    <span>{feedback.thumbs_down} responses</span>
                                                </div>
                                                <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '12px' }}>
                                                    <div style={{
                                                        width: `${100 - feedback.satisfaction_rate}%`,
                                                        background: '#dc2626', height: '12px',
                                                        borderRadius: '999px', transition: 'width 0.5s'
                                                    }} />
                                                </div>
                                            </div>
                                            <div style={{
                                                marginTop: '1.5rem', padding: '1rem', background: '#f9fafb',
                                                borderRadius: '8px', textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
                                                color: feedback.satisfaction_rate >= 70 ? '#047857' : '#dc2626'
                                            }}>
                                                {feedback.satisfaction_rate >= 70 ? '😊' : '😟'} {feedback.satisfaction_rate}% Satisfaction Rate
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'pdfs' && (
                            <PDFManager adminKey="stanley2025" API_URL={API_URL} />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}