import { http, HttpResponse, delay } from 'msw'
import { users, refreshTokens, signAccess, readAccess, newRefresh, persistDb, publicUser, resetTokens, verifyTokens, sendMail, RESET_TTL_MS, type DbUser, ACCESS_TTL_MS, MAX_ATTEMPTS, LOCK_MS } from './db'

const BASE = '/api'
const lag = () => delay(300 + Math.random() * 700)

/** Dev switch: localStorage['mock.fail'] = '500' | 'network' | 'timeout' */
function forcedFailure() {
  let mode: string | null = null
  try { mode = localStorage.getItem('mock.fail') } catch { /* ignore */ }
  if (mode === '500') return HttpResponse.json({ message: 'Internal server error' }, { status: 500 })
  if (mode === 'network') return HttpResponse.error()
  if (mode === 'timeout') return delay(30_000).then(() => HttpResponse.json({ message: 'Timeout' }, { status: 504 }))
  return null
}

function issueVerification(u: DbUser) {
  const t = `v_${crypto.randomUUID()}`
  verifyTokens.set(t, { userId: u.id })
  sendMail(u.email, 'Verify your email', `/verify-email?token=${t}`)
}

function authedUser(req: Request) {
  const claims = readAccess(req.headers.get('Authorization')?.replace('Bearer ', '') ?? null)
  return claims ? { claims, user: users.find((u) => u.id === claims.sub) } : null
}

export const handlers = [
  http.post(`${BASE}/auth/signup`, async ({ request }) => {
    await lag()
    const f = forcedFailure(); if (f) return f
    const b = (await request.json()) as { name: string; email: string; password: string }
    const email = b.email.trim().toLowerCase()
    if (users.some((u) => u.email === email)) {
      return HttpResponse.json({ message: 'Email already registered', fieldErrors: { email: 'Email already registered' } }, { status: 409 })
    }
    const u = { id: `u${users.length + 1}`, name: b.name.trim(), email, password: b.password, role: 'user' as const, verified: false, locked: false, failedAttempts: 0, lockedUntil: 0 }
    users.push(u)
    persistDb()
    issueVerification(u)
    return HttpResponse.json({ user: publicUser(u) }, { status: 201 })
  }),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await lag()
    const f = forcedFailure(); if (f) return f
    const b = (await request.json()) as { email: string; password: string }
    const u = users.find((x) => x.email === b.email.trim().toLowerCase())
    const generic = HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    if (!u) return generic
    if (u.locked || u.lockedUntil > Date.now()) {
      const secs = u.locked ? 900 : Math.ceil((u.lockedUntil - Date.now()) / 1000)
      return HttpResponse.json({ message: `Too many attempts, try again in ${secs}s` }, { status: 429, headers: { 'Retry-After': String(secs) } })
    }
    if (u.password !== b.password) {
      if (++u.failedAttempts >= MAX_ATTEMPTS) { u.failedAttempts = 0; u.lockedUntil = Date.now() + LOCK_MS }
      persistDb()
      return generic
    }
    u.failedAttempts = 0
    persistDb()
    return HttpResponse.json({ accessToken: signAccess(u), refreshToken: newRefresh(u.id), expiresIn: ACCESS_TTL_MS / 1000, user: publicUser(u) })
  }),

  http.post(`${BASE}/auth/logout`, async ({ request }) => {
    await lag()
    const b = (await request.json().catch(() => ({}))) as { refreshToken?: string }
    if (b.refreshToken) { refreshTokens.delete(b.refreshToken); persistDb() }
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    await delay(150)
    const f = forcedFailure(); if (f) return f
    const b = (await request.json()) as { refreshToken?: string }
    const rec = b.refreshToken ? refreshTokens.get(b.refreshToken) : undefined
    const u = rec && rec.exp > Date.now() ? users.find((x) => x.id === rec.userId) : undefined
    if (!rec || !u) return HttpResponse.json({ message: 'Session expired' }, { status: 401 })
    refreshTokens.delete(b.refreshToken!)   // rotate
    return HttpResponse.json({ accessToken: signAccess(u), refreshToken: newRefresh(u.id), expiresIn: ACCESS_TTL_MS / 1000 })
  }),

  http.get(`${BASE}/me`, async ({ request }) => {
    await lag()
    const f = forcedFailure(); if (f) return f
    const a = authedUser(request)
    if (!a?.user) return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    return HttpResponse.json({ user: publicUser(a.user) })
  }),

  http.post(`${BASE}/auth/forgot-password`, async ({ request }) => {
    await lag()
    const f = forcedFailure(); if (f) return f
    const b = (await request.json().catch(() => ({}))) as { email?: string }
    const u = users.find((x) => x.email === b.email?.trim().toLowerCase())
    if (u) {
      const t = `p_${crypto.randomUUID()}`
      resetTokens.set(t, { userId: u.id, exp: Date.now() + RESET_TTL_MS })
      sendMail(u.email, 'Reset your password', `/reset-password?token=${t}`)
    }
    // Same response whether or not the account exists (no account enumeration).
    return HttpResponse.json({ message: 'If that account exists, we sent an email.' })
  }),

  http.post(`${BASE}/auth/reset-password`, async ({ request }) => {
    await lag()
    const f = forcedFailure(); if (f) return f
    const b = (await request.json()) as { token?: string; password?: string }
    const rec = b.token ? resetTokens.get(b.token) : undefined
    const u = rec && rec.exp > Date.now() ? users.find((x) => x.id === rec.userId) : undefined
    if (!rec || !u || !b.password) return HttpResponse.json({ message: 'This reset link is invalid or has expired.' }, { status: 400 })
    u.password = b.password
    u.failedAttempts = 0; u.lockedUntil = 0
    resetTokens.delete(b.token!)
    for (const [k, v] of refreshTokens) if (v.userId === u.id) refreshTokens.delete(k)  // sign out everywhere
    persistDb()
    return HttpResponse.json({ message: 'Password updated' })
  }),

  http.post(`${BASE}/auth/verify-email`, async ({ request }) => {
    await lag()
    const f = forcedFailure(); if (f) return f
    const b = (await request.json()) as { token?: string }
    const rec = b.token ? verifyTokens.get(b.token) : undefined
    const u = rec && users.find((x) => x.id === rec.userId)
    if (!rec || !u) return HttpResponse.json({ message: 'This verification link is invalid or has expired.' }, { status: 400 })
    u.verified = true
    verifyTokens.delete(b.token!)
    persistDb()
    return HttpResponse.json({ message: 'Email verified' })
  }),

  http.post(`${BASE}/auth/resend-verification`, async ({ request }) => {
    await lag()
    const f = forcedFailure(); if (f) return f
    const b = (await request.json().catch(() => ({}))) as { email?: string }
    const u = users.find((x) => x.email === b.email?.trim().toLowerCase())
    if (u && !u.verified) issueVerification(u)
    return HttpResponse.json({ message: 'If that account needs verification, we sent an email.' })
  }),

  http.get(`${BASE}/admin/users`, async ({ request }) => {
    await lag()
    const a = authedUser(request)
    if (!a?.user) return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    if (a.user.role !== 'admin') return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    return HttpResponse.json({ users: users.map(publicUser) })
  }),
]
