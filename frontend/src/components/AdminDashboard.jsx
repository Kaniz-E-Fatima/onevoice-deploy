import { useState, useEffect } from 'react'
import '../styles/admin.css'

const ADMIN_KEY = 'stanley2025'
const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function AdminDashboard() {
    const [isAuth, setIsAuth] = useState(false)
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [analytics, setAnalytics] = useState(null)
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')

    const handleLogin = () => {
        if (password === ADMIN_KEY) {
            setIsAuth(true)
            setError('')
            fetchData()
        } else {
            setError('Incorrect password!')
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const [analyticsRes, sessionsRes] = await Promise.all([
                fetch(`${API_URL}/analytics/summary`, { headers: { 'X-Admin-Key': ADMIN_KEY } }),
                fetch(`${API_URL}/admin/sessions`, { headers: { 'X-Admin-Key': ADMIN_KEY } })
            ])
            const analyticsData = await analyticsRes.json()
            const sessionsData = await sessionsRes.json()
            setAnalytics(analyticsData)
            setSessions(sessionsData.sessions || [])
        } catch (err) {
            console.error('Failed to fetch data:', err)
        } finally {
            setLoading(false)
        }
    }

    if (!isAuth) {
        return (
            <div className="admin-login">
                <div className="admin-login-card">
                    <img src="/logo.png" alt="Stanley College" className="admin-logo" />
                    <h2>OneVoice Admin</h2>
                    <p>Stanley College Dashboard</p>
                    <input
                        type="password"
                        placeholder="Enter admin password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        className="admin-input"
                    />
                    {error && <div className="admin-error">{error}</div>}
                    <button className="admin-btn" onClick={handleLogin}>Login</button>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <div className="admin-header-left">
                    <img src="/logo.png" alt="Stanley College" className="admin-logo-sm" />
                    <div>
                        <div className="admin-title">OneVoice Admin Dashboard</div>
                        <div className="admin-subtitle">Stanley College · Analytics & Insights</div>
                    </div>
                </div>
                <div className="admin-header-right">
                    <button className="admin-refresh-btn" onClick={fetchData}>🔄 Refresh</button>
                    <button className="admin-logout-btn" onClick={() => setIsAuth(false)}>Logout</button>
                </div>
            </div>

            <div className="admin-tabs">
                <button className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Overview</button>
                <button className={`admin-tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>💬 Sessions</button>
            </div>

            {loading ? (
                <div className="admin-loading">Loading data...</div>
            ) : activeTab === 'overview' ? (
                <div className="admin-content">
                    <div className="admin-stats-grid">
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon">👥</div>
                            <div className="admin-stat-number">{analytics?.total_sessions || 0}</div>
                            <div className="admin-stat-label">Total Sessions</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon">💬</div>
                            <div className="admin-stat-number">{analytics?.total_queries || 0}</div>
                            <div className="admin-stat-label">Total Queries</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon">🌐</div>
                            <div className="admin-stat-number">{sessions.length || 0}</div>
                            <div className="admin-stat-label">Recent Sessions</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon">⚡</div>
                            <div className="admin-stat-number">{analytics?.total_queries > 0 ? Math.round(analytics.total_queries / Math.max(analytics.total_sessions, 1) * 10) / 10 : 0}</div>
                            <div className="admin-stat-label">Avg Queries/Session</div>
                        </div>
                    </div>

                    <div className="admin-section">
                        <h3>🔥 Top Questions Asked</h3>
                        <div className="intent-list">
                            {analytics?.top_intents?.length > 0 ? analytics.top_intents.map((item, i) => (
                                <div key={i} className="intent-item">
                                    <div className="intent-rank">#{i + 1}</div>
                                    <div className="intent-name">{item._id || 'general'}</div>
                                    <div className="intent-bar">
                                        <div className="intent-fill" style={{ width: `${Math.min((item.count / (analytics.top_intents[0]?.count || 1)) * 100, 100)}%` }} />
                                    </div>
                                    <div className="intent-count">{item.count} queries</div>
                                </div>
                            )) : (
                                <div className="admin-empty">No data yet. Start chatting to see analytics!</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="admin-content">
                    <div className="admin-section">
                        <h3>💬 Recent Chat Sessions</h3>
                        {sessions.length > 0 ? sessions.map((session, i) => (
                            <div key={i} className="session-card">
                                <div className="session-header">
                                    <span className="session-id">Session: {session.session_id?.slice(0, 8)}...</span>
                                    <span className="session-count">{session.messages?.length || 0} messages</span>
                                </div>
                                <div className="session-messages">
                                    {session.messages?.slice(0, 3).map((msg, j) => (
                                        <div key={j} className={`session-msg ${msg.role}`}>
                                            <span className="session-role">{msg.role === 'user' ? '👤' : '🤖'}</span>
                                            <span className="session-text">{msg.content?.slice(0, 100)}{msg.content?.length > 100 ? '...' : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="admin-empty">No sessions yet!</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}