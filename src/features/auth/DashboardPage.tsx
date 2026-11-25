import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { api } from '../../lib/api/client'
import { authEvents } from '../../lib/api/authEvents'
import { refreshAccessToken, sessionStats } from '../../lib/api/refresh'
import { useRequestLog } from '../../lib/api/requestLog'
import { decodeExp } from '../../lib/api/tokenExpiry'
import { tokens } from '../../lib/api/tokens'
import { persistDb, refreshTokens } from '../../mocks/db'
import { formatClock, formatIdleLimit, getIdleConfig } from './idleConfig'
import type { User } from './types'

function useAccessCountdown() {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => {
      const exp = decodeExp(tokens.getAccess())
      setLeft(exp === null ? null : Math.max(0, exp - Date.now() / 1000))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  return left
}

export function DashboardPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['me'], queryFn: () => api<{ user: User }>('/me') })
  const user = data?.user
  const accessLeft = useAccessCountdown()
  const logs = useRequestLog()
  const [rotations, setRotations] = useState(sessionStats.refreshes)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => authEvents.on('token-refreshed', () => setRotations(sessionStats.refreshes)), [])

  const simulateRefresh = async () => {
    try {
      await refreshAccessToken()
      setToast('Session refreshed in the background. You stayed signed in.')
    } catch {
      setToast('Could not refresh the session right now.')
    }
  }
  // Mock-only: revoke the refresh token server-side and break the access token, then make a request.
  const forceExpire = () => {
    refreshTokens.clear()
    persistDb()
    tokens.setAccess('expired')
    void qc.invalidateQueries({ queryKey: ['me'] })
  }

  return (
    <AppShell>
      {toast && <div role="status" className="alert alert-success">{toast}</div>}
      {user && !user.verified && (
        <div role="status" className="alert alert-notice">Your email isn't verified. <Link to="/verify-email">Verify it</Link></div>
      )}
      <div>
        <h1 className="page-title">Good to see you, {(user?.name ?? '').split(' ')[0] || 'there'}</h1>
        <p className="page-sub">This page only renders while you hold a valid session.</p>
        {user && <p className="demo" style={{ marginTop: 6 }}>Signed in as {user.email} ({user.role})</p>}
      </div>
      <div className="dash-grid">
        <section className="dash-main" aria-label="Session">
          <div className="cards">
            <div className="panel">
              <div className="stat-label">Access token</div>
              <div className="stat-value" style={{ color: 'var(--link)' }}>{accessLeft === null ? '—' : formatClock(accessLeft)}</div>
              <div className="stat-note">until silent refresh</div>
            </div>
            <div className="panel">
              <div className="stat-label">Refresh token</div>
              <div className="stat-value" style={{ color: 'var(--ok-strong)' }}>Valid</div>
              <div className="stat-note">rotated {rotations} time(s)</div>
            </div>
            <div className="panel">
              <div className="stat-label">Session</div>
              <div className="stat-value">Active</div>
              <div className="stat-note">idle limit {formatIdleLimit(getIdleConfig().idleMs)}</div>
            </div>
          </div>
          <div className="panel stack" style={{ gap: 14 }}>
            <h2 style={{ fontSize: 18 }}>Try the session states</h2>
            <p className="demo">Mock-only controls to see what happens behind the scenes.</p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => void simulateRefresh()}>Simulate token refresh</button>
              <button type="button" className="btn btn-ghost" onClick={() => authEvents.emit('demo-idle-warning')}>Show expiry warning</button>
              <button type="button" className="btn btn-ghost" onClick={forceExpire}>Force 401 (expire)</button>
            </div>
          </div>
        </section>
        <section className="log-panel" aria-label="Mock API log">
          <h2>Mock API log</h2>
          <ul className="log-lines">
            {logs.length === 0 && <li>No requests yet.</li>}
            {logs.map((l, i) => <li key={`${i}-${l}`}>{l}</li>)}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}
