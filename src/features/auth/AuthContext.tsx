import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api/client'
import { tokens } from '../../lib/api/tokens'
import type { AuthStatus, TokenResponse, User } from './types'

interface AuthValue {
  user: User | null
  status: AuthStatus
  login(email: string, password: string, remember: boolean): Promise<void>
  signup(input: { name: string; email: string; password: string }): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

// Single-flight: refresh tokens rotate, so concurrent restores (e.g. StrictMode's double
// effect) must share one request or the second would fail and clear the session.
let restoring: Promise<User | null> | null = null
function restoreSession(): Promise<User | null> {
  restoring ??= (async () => {
    const refreshToken = tokens.getRefresh()
    if (!refreshToken) return null
    try {
      const t = await api<TokenResponse>('/auth/refresh', { method: 'POST', json: { refreshToken }, auth: false })
      tokens.setAccess(t.accessToken)
      tokens.setRefresh(t.refreshToken, tokens.isPersistent())
      return (await api<{ user: User }>('/me')).user
    } catch {
      tokens.clear()
      return null
    } finally {
      restoring = null
    }
  })()
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

  const login = useCallback<AuthValue['login']>(async (email, password, remember) => {
    const t = await api<TokenResponse>('/auth/login', { method: 'POST', json: { email, password }, auth: false })
    tokens.setAccess(t.accessToken)
    tokens.setRefresh(t.refreshToken, remember)
    setUser(t.user ?? null)
    setStatus('authenticated')
  }, [])

  const signup = useCallback<AuthValue['signup']>(async (input) => {
    await api('/auth/signup', { method: 'POST', json: input, auth: false })
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = tokens.getRefresh()
    try { await api('/auth/logout', { method: 'POST', json: { refreshToken } }) } catch { /* best effort */ }
    tokens.clear()
    qc.clear()                       // drop all cached server data
    setUser(null)
    setStatus('unauthenticated')
  }, [qc])

  const value = useMemo(() => ({ user, status, login, signup, logout }), [user, status, login, signup, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
