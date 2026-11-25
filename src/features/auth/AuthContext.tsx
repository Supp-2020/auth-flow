import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api/client'
import { authEvents } from '../../lib/api/authEvents'
import { refreshAccessToken } from '../../lib/api/refresh'
import { msUntilRefresh } from '../../lib/api/tokenExpiry'
import { tokens } from '../../lib/api/tokens'
import { broadcast, onTabMessage } from '../../lib/api/tabSync'
import { clearRequestLog } from '../../lib/api/requestLog'
import { notice } from './notice'
import type { AuthStatus, TokenResponse, User } from './types'

interface AuthValue {
  user: User | null
  status: AuthStatus
  /** true after the server ended the session (refresh rejected), until the next login/logout */
  sessionExpired: boolean
  login(email: string, password: string, remember: boolean): Promise<void>
  signup(input: { name: string; email: string; password: string }): Promise<void>
  logout(): Promise<void>
  updateUser(user: User): void
}

const AuthContext = createContext<AuthValue | null>(null)

// Single-flight: refresh tokens rotate, so concurrent restores (e.g. StrictMode's double
// effect) must share one request or the second would fail and clear the session.
let restoring: Promise<User | null> | null = null
function restoreSession(): Promise<User | null> {
  if (!restoring) {
    const p: Promise<User | null> = (async () => {
      if (!tokens.getRefresh()) return null
      try {
        await refreshAccessToken()
        return (await api<{ user: User }>('/me')).user
      } catch {
        // A rejected refresh token already cleared the session; offline/5xx keeps the token for a later retry.
        return null
      }
    })()
    // Clear after assignment: an async fn that returns before its first await would otherwise
    // run any inner `finally` first and leave a stale, already-resolved promise cached forever.
    restoring = p
    void p.finally(() => { if (restoring === p) restoring = null })
  }
  return restoring
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // Restore the session on load: exchange the stored refresh token, then GET /me.
  useEffect(() => {
    let cancelled = false
    restoreSession().then((u) => {
      if (cancelled) return
      setUser(u)
      setStatus(u ? 'authenticated' : 'unauthenticated')
    })
    return () => { cancelled = true }
  }, [])

  // Refresh failed for good (revoked/expired): clear state and send the user to login with a message.
  // The route guard reads `sessionExpired` and redirects to /login?expired=1&redirect=… itself.
  const [sessionExpired, setSessionExpired] = useState(false)
  useEffect(() => authEvents.on('session-expired', () => {
    qc.clear()
    setUser(null)
    setSessionExpired(true)
    setStatus('unauthenticated')
  }), [qc])

  // Multi-tab sync: a logout/login in another tab is mirrored here.
  useEffect(() => onTabMessage((msg) => {
    if (msg === 'logout') {
      const refreshToken = tokens.getRefresh()
      if (refreshToken) void api('/auth/logout', { method: 'POST', json: { refreshToken }, auth: false }).catch(() => {})
      tokens.clear()
      qc.clear()
      setUser(null)
      setSessionExpired(false)
      setStatus('unauthenticated')
      notice.set('other-tab')
    } else if (msg === 'login') {
      void restoreSession().then((u) => {
        if (!u) return
        setUser(u)
        setSessionExpired(false)
        setStatus('authenticated')
      })
    }
  }), [qc])

  // Proactive refresh shortly before the access token expires; retry while offline.
  useEffect(() => {
    if (status !== 'authenticated') return
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = (delay?: number | null) => {
      clearTimeout(timer)
      const ms = delay ?? msUntilRefresh(tokens.getAccess())
      if (ms == null) return
      timer = setTimeout(() => { refreshAccessToken().catch(() => schedule(5_000)) }, ms)
    }
    const offRefreshed = authEvents.on('token-refreshed', () => schedule())
    const onOnline = () => schedule(0)
    window.addEventListener('online', onOnline)
    schedule()
    return () => { clearTimeout(timer); offRefreshed(); window.removeEventListener('online', onOnline) }
  }, [status])

  const login = useCallback<AuthValue['login']>(async (email, password, remember) => {
    const t = await api<TokenResponse>('/auth/login', { method: 'POST', json: { email, password }, auth: false })
    tokens.setAccess(t.accessToken)
    tokens.setRefresh(t.refreshToken, remember)
    setUser(t.user ?? null)
    setSessionExpired(false)
    setStatus('authenticated')
    broadcast('login')
  }, [])

  const signup = useCallback<AuthValue['signup']>(async (input) => {
    await api('/auth/signup', { method: 'POST', json: input, auth: false })
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = tokens.getRefresh()
    try { await api('/auth/logout', { method: 'POST', json: { refreshToken }, auth: false }) } catch { /* best effort */ }
    tokens.clear()
    qc.clear()                       // drop all cached server data
    clearRequestLog()
    setUser(null)
    setSessionExpired(false)
    setStatus('unauthenticated')
    broadcast('logout')
  }, [qc])

  const value = useMemo(
    () => ({ user, status, sessionExpired, login, signup, logout, updateUser: setUser }),
    [user, status, sessionExpired, login, signup, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
