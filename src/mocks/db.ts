// MOCK ONLY: fake users with obviously fake passwords. Not secure. Never use real credentials.
export type Role = 'user' | 'admin'
export interface DbUser {
  id: string; name: string; email: string; password: string
  role: Role; verified: boolean; locked: boolean
  failedAttempts: number; lockedUntil: number
}

export const ACCESS_TTL_MS = 30_000          // short in dev so refresh is visible
export const REFRESH_TTL_MS = 7 * 24 * 3600_000
export const MAX_ATTEMPTS = 5
export const LOCK_MS = 30_000

export const users: DbUser[] = [
  { id: 'u1', name: 'Test User', email: 'user@example.test', password: 'Password-1234!', role: 'user', verified: true, locked: false, failedAttempts: 0, lockedUntil: 0 },
  { id: 'u2', name: 'Test Admin', email: 'admin@example.test', password: 'Password-1234!', role: 'admin', verified: true, locked: false, failedAttempts: 0, lockedUntil: 0 },
  { id: 'u3', name: 'Unverified User', email: 'unverified@example.test', password: 'Password-1234!', role: 'user', verified: false, locked: false, failedAttempts: 0, lockedUntil: 0 },
  { id: 'u4', name: 'Locked User', email: 'locked@example.test', password: 'Password-1234!', role: 'user', verified: true, locked: true, failedAttempts: 0, lockedUntil: 0 },
]

export const refreshTokens = new Map<string, { userId: string; exp: number }>()

// Mock-only persistence so a page reload doesn't wipe the "server" (real servers keep state).
export const resetTokens = new Map<string, { userId: string; exp: number }>()
export const verifyTokens = new Map<string, { userId: string }>()
/** Fake outbox: stands in for real email so the flows are testable without a backend. */
export const mailbox: { id: string; to: string; subject: string; link: string; at: number }[] = []
export const RESET_TTL_MS = 15 * 60_000

export function sendMail(to: string, subject: string, link: string) {
  mailbox.unshift({ id: crypto.randomUUID(), to, subject, link, at: Date.now() })
  persistDb()
}

const DB_KEY = 'mock.db'
export function persistDb() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify({
      users, refresh: [...refreshTokens], reset: [...resetTokens], verify: [...verifyTokens], mailbox,
    }))
  } catch { /* ignore */ }
}
/**
 * Reload the mock "server" from localStorage. Called before every request so that several tabs
 * (each with its own MSW instance and memory) behave like one shared backend.
 */
export function syncDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return
    const s = JSON.parse(raw)
    users.splice(0, users.length, ...s.users)
    refreshTokens.clear(); resetTokens.clear(); verifyTokens.clear()
    s.refresh?.forEach(([k, v]: [string, never]) => refreshTokens.set(k, v))
    s.reset?.forEach(([k, v]: [string, never]) => resetTokens.set(k, v))
    s.verify?.forEach(([k, v]: [string, never]) => verifyTokens.set(k, v))
    mailbox.splice(0, mailbox.length, ...(s.mailbox ?? []))
  } catch { /* ignore corrupt state */ }
}
syncDb()

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
export function signAccess(u: DbUser) {
  return `mock.${b64({ sub: u.id, role: u.role, exp: Math.floor((Date.now() + ACCESS_TTL_MS) / 1000) })}.sig`
}
export function readAccess(token: string | null): { sub: string; role: Role; exp: number } | null {
  if (!token) return null
  try {
    const p = JSON.parse(atob(token.split('.')[1]))
    return p.exp * 1000 > Date.now() ? p : null
  } catch { return null }
}
export function newRefresh(userId: string) {
  const t = `r_${crypto.randomUUID()}`
  refreshTokens.set(t, { userId, exp: Date.now() + REFRESH_TTL_MS })
  persistDb()
  return t
}
export const publicUser = (u: DbUser) => ({ id: u.id, name: u.name, email: u.email, role: u.role, verified: u.verified })
