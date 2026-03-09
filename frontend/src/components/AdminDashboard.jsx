import { useState } from 'react'
import '../styles/admin.css'

const ADMIN_KEY = 'stanley2025'
const API_URL = import.meta.env.VITE_API_URL || '/api'

function timeAgo(dateStr) {
    if (!dateStr) return '—'
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
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
    const lang = session.language || 'english'
    const msgCount = session.message_count || session.messages?.length || 0
    return (
        <div className={`adm-session-row ${active ? 'active' : ''}`} onClick={() => onClick(session)}>
            <div className="adm-session-left">
                <div className="adm-session-avatar">{LANG_FLAGS[lang] || '🌐'}</div>
                <div>
                    <div className="adm-session-id">...{session._id?.slice(-10)}</div>
                    <div className="adm-session-meta">{lang} · {msgCount} msgs</div>
                </div>
            </div>
            <div className="adm-session-time">{timeAgo(session.updated_at)}</div>
        </div>
    )
}

function MsgBubble({ msg }) {
    const isUser = msg.role === 'user'
    return (
        <div className={`adm-bubble-wrap ${isUser ? 'user' : 'bot'}`}>
            <div className={`adm-bubble ${isUser ? 'user' : 'bot'}`}>
                <div className="adm-bubble-role">{isUser ? '👤 Student' : '🤖 OneVoice'}</div>
                <div>{msg.content}</div>
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

export default function AdminDashboard() {
    const [isAuth, setIsAuth] = useState(false)
    const [password, setPassword] = useState('')
    const [loginError, setLoginError] = useState('')
    const [analytics, setAnalytics] = useState(null)
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [selectedSession, setSelectedSession] = useState(null)
    const [search, setSearch] = useState('')

    const headers = { 'X-Admin-Key': ADMIN_KEY, 'Content-Type': 'application/json' }

    const fetchData = async () => {
        setLoading(true)
        try {
            const [aRes, sRes] = await Promise.all([
                fetch(`${API_URL}/analytics/summary`, { headers }),
                fetch(`${API_URL}/admin/sessions`, { headers })
            ])
            if (aRes.ok) setAnalytics(await aRes.json())
            if (sRes.ok) {
                const data = await sRes.json()
                setSessions(Array.isArray(data) ? data : (data.sessions || []))
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handleLogin = () => {
        if (!password.trim()) { setLoginError('Please enter a password'); return }
        if (password === ADMIN_KEY) {
            setIsAuth(true); setLoginError('')
            fetchData()
        } else {
            setLoginError('Incorrect password. Try again.')
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchData()
        setRefreshing(false)
    }

    // ── Derived data ──
    const totalMessages = sessions.reduce((a, s) => a + (s.message_count || s.messages?.length || 0), 0)
    const todaySessions = sessions.filter(s => s.updated_at && new Date(s.updated_at).toDateString() === new Date().toDateString()).length
    const langCounts = sessions.reduce((acc, s) => {
        const l = s.language || 'english'; acc[l] = (acc[l] || 0) + 1; return acc
    }, {})
    const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const avgMsgs = sessions.length ? Math.round((totalMessages / sessions.length) * 10) / 10 : 0

    const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d })
    const dayCounts = last7.map(d => sessions.filter(s => s.updated_at && new Date(s.updated_at).toDateString() === d.toDateString()).length)
    const maxDay = Math.max(...dayCounts, 1)

    const filtered = sessions.filter(s =>
        !search || s._id?.toLowerCase().includes(search.toLowerCase()) || (s.language || '').includes(search.toLowerCase())
    )

    // ── LOGIN ──────────────────────────────────────────────────────────────────
    if (!isAuth) {
        return (
            <div className="adm-login-bg">
                <div className="adm-login-card">
                    <img src="/logo.png" alt="Stanley College" className="adm-login-logo" />
                    <h2 className="adm-login-title">OneVoice Admin</h2>
                    <p className="adm-login-sub">Stanley College · Secure Dashboard</p>
                    <input
                        type="password"
                        placeholder="Enter admin password..."
                        value={password}
                        onChange={e => { setPassword(e.target.value); setLoginError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        className="adm-login-input"
                    />
                    {loginError && <div className="adm-login-error">⚠️ {loginError}</div>}
                    <button className="adm-login-btn" onClick={handleLogin}>Access Dashboard →</button>
                    <div className="adm-login-hint">Admin key is set in your backend .env</div>
                </div>
            </div>
        )
    }

    // ── DASHBOARD ──────────────────────────────────────────────────────────────
    return (
        <div className="adm-root">

            {/* Header */}
            <header className="adm-header">
                <div className="adm-header-left">
                    <img src="/logo.png" alt="SC" className="adm-header-logo" />
                    <div>
                        <div className="adm-header-title">OneVoice Admin Dashboard</div>
                        <div className="adm-header-sub">Stanley College · Analytics & Insights</div>
                    </div>
                </div>
                <div className="adm-header-right">
                    <span className="adm-live-badge">🟢 Live</span>
                    <button className="adm-btn-refresh" onClick={handleRefresh} disabled={refreshing}>
                        {refreshing ? '⏳' : '🔄'} Refresh
                    </button>
                    <button className="adm-btn-logout" onClick={() => { setIsAuth(false); setPassword('') }}>Logout</button>
                </div>
            </header>

            {/* Tabs */}
            <div className="adm-tabs">
                {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'sessions', label: '💬 Sessions' },
                    { id: 'analytics', label: '📈 Analytics' },
                    { id: 'languages', label: '🌐 Languages' },
                ].map(t => (
                    <button key={t.id}
                        className={`adm-tab ${activeTab === t.id ? 'active' : ''}`}
                        onClick={() => { setActiveTab(t.id); setSelectedSession(null) }}
                    >{t.label}</button>
                ))}
            </div>

            {/* Content */}
            <div className="adm-content">
                {loading ? (
                    <div className="adm-loading"><div className="adm-spinner" />Loading data...</div>
                ) : (
                    <>

                        {/* ── OVERVIEW ── */}
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
                                            ? <div className="adm-empty">No sessions yet. Students haven't chatted!</div>
                                            : sessions.slice(0, 6).map(s => (
                                                <SessionRow key={s._id} session={s} active={false}
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

                                {analytics?.top_intents?.length > 0 && (
                                    <div className="adm-card">
                                        <div className="adm-card-title">🔥 Top Topics Asked</div>
                                        <div className="adm-intent-list">
                                            {analytics.top_intents.map((item, i) => (
                                                <div key={i} className="adm-intent-item">
                                                    <div className="adm-intent-rank">#{i + 1}</div>
                                                    <div className="adm-intent-name">{item._id || 'general'}</div>
                                                    <div className="adm-intent-bar-wrap">
                                                        <div className="adm-intent-bar"
                                                            style={{ width: `${Math.min((item.count / (analytics.top_intents[0]?.count || 1)) * 100, 100)}%` }} />
                                                    </div>
                                                    <div className="adm-intent-count">{item.count}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── SESSIONS ── */}
                        {activeTab === 'sessions' && (
                            <div className="adm-sessions-layout">
                                <div className="adm-sessions-list-panel">
                                    <input
                                        className="adm-search"
                                        placeholder="🔍 Search by ID or language..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    <div className="adm-session-count-label">{filtered.length} sessions</div>
                                    {filtered.length === 0
                                        ? <div className="adm-empty">No sessions found</div>
                                        : filtered.map(s => (
                                            <SessionRow key={s._id} session={s}
                                                active={selectedSession?._id === s._id}
                                                onClick={setSelectedSession} />
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
                                                    <div className="adm-detail-id">{selectedSession._id}</div>
                                                    <div className="adm-detail-meta">
                                                        {LANG_FLAGS[selectedSession.language] || '🌐'} {selectedSession.language || 'english'} ·{' '}
                                                        {selectedSession.message_count || selectedSession.messages?.length || 0} messages ·{' '}
                                                        {timeAgo(selectedSession.updated_at)}
                                                    </div>
                                                </div>
                                                <button className="adm-close-btn" onClick={() => setSelectedSession(null)}>✕</button>
                                            </div>
                                            <div className="adm-messages-area">
                                                {selectedSession.messages?.length > 0
                                                    ? selectedSession.messages.map((msg, i) => <MsgBubble key={i} msg={msg} />)
                                                    : <div className="adm-empty">No messages stored for this session yet.</div>
                                                }
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── ANALYTICS ── */}
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
                                    <div className="adm-card-title">📋 Session Log</div>
                                    <div className="adm-table-wrap">
                                        <table className="adm-table">
                                            <thead>
                                                <tr>
                                                    <th>Session ID</th><th>Language</th><th>Messages</th><th>Created</th><th>Last Active</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sessions.slice(0, 25).map(s => (
                                                    <tr key={s._id} className="adm-table-row"
                                                        onClick={() => { setSelectedSession(s); setActiveTab('sessions') }}>
                                                        <td className="adm-table-id">...{s._id?.slice(-12)}</td>
                                                        <td style={{ textTransform: 'capitalize' }}>{s.language || 'english'}</td>
                                                        <td>{s.message_count || s.messages?.length || 0}</td>
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

                        {/* ── LANGUAGES ── */}
                        {activeTab === 'languages' && (
                            <>
                                <div className="adm-stats-grid">
                                    {Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                                        <StatCard key={lang}
                                            icon={LANG_FLAGS[lang] || '🌐'}
                                            label={lang.charAt(0).toUpperCase() + lang.slice(1)}
                                            value={`${count} sessions`}
                                            color={LANG_COLORS[lang] || '#8B0000'}
                                        />
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
                                        <div className="adm-empty">No language data yet. Students need to chat first!</div>
                                    )}
                                </div>
                            </>
                        )}

                    </>
                )}
            </div>
        </div>
    )
}
