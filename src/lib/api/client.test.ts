import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { newRefresh } from '../../mocks/db'
import { api, ApiError } from './client'
import { authEvents } from './authEvents'
import { tokens } from './tokens'
import { decodeExp, isExpired, msUntilRefresh } from './tokenExpiry'

vi.setConfig({ testTimeout: 20_000 })

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

let expired = 0
let off: () => void
beforeEach(() => {
  tokens.clear()
  expired = 0
  off = authEvents.on('session-expired', () => { expired++ })
})
afterEach(() => { off(); server.resetHandlers(); vi.restoreAllMocks() })

const fakeToken = (exp: number) => `mock.${btoa(JSON.stringify({ exp })).replace(/=+$/, '')}.sig`

describe('token expiry helpers', () => {
  it('decodes exp and rejects malformed tokens', () => {
    expect(decodeExp(fakeToken(123))).toBe(123)
    expect(decodeExp('garbage')).toBeNull()
    expect(decodeExp(null)).toBeNull()
  })
  it('schedules refresh before expiry with a floor', () => {
    const now = 1_000_000
    expect(msUntilRefresh(fakeToken(now / 1000 + 30), now)).toBe(20_000)
    expect(msUntilRefresh(fakeToken(now / 1000 + 5), now)).toBe(1_000)
    expect(msUntilRefresh('garbage', now)).toBeNull()
  })
  it('detects expiry', () => {
    expect(isExpired(fakeToken(1), Date.now())).toBe(true)
    expect(isExpired(fakeToken(Date.now() / 1000 + 60))).toBe(false)
  })
})

describe('refresh interceptor', () => {
  it('refreshes on 401 and retries the original request', async () => {
    tokens.setRefresh(newRefresh('u1'), true)
    tokens.setAccess('expired-or-invalid')
    const res = await api<{ user: { email: string } }>('/me')
    expect(res.user.email).toBe('user@example.test')
    expect(tokens.getAccess()).not.toBe('expired-or-invalid')
  })

  it('makes a single refresh call for concurrent 401s', async () => {
    tokens.setRefresh(newRefresh('u1'), true)
    tokens.setAccess('expired-or-invalid')
    const spy = vi.spyOn(globalThis, 'fetch')
    const results = await Promise.all([api('/me'), api('/me'), api('/me')])
    expect(results).toHaveLength(3)
    const refreshCalls = spy.mock.calls.filter(([u]) => String(u).includes('/auth/refresh'))
    expect(refreshCalls).toHaveLength(1)
    expect(expired).toBe(0)
  })

  it('clears the session and signals expiry when refresh is rejected', async () => {
    tokens.setRefresh('r_revoked', true)
    tokens.setAccess('expired-or-invalid')
    await expect(api('/me')).rejects.toMatchObject({ status: 401 })
    expect(expired).toBe(1)
    expect(tokens.getRefresh()).toBeNull()
    expect(tokens.getAccess()).toBeNull()
  })

  it('keeps the session when the refresh call fails offline', async () => {
    server.use(http.post('/api/auth/refresh', () => HttpResponse.error()))
    const rt = newRefresh('u1')
    tokens.setRefresh(rt, true)
    tokens.setAccess('expired-or-invalid')
    const err: unknown = await api('/me').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(0)
    expect(expired).toBe(0)
    expect(tokens.getRefresh()).toBe(rt)
  })

  it('does not try to refresh for unauthenticated calls like login', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await expect(api('/auth/login', { method: 'POST', json: { email: 'user@example.test', password: 'wrong' }, auth: false }))
      .rejects.toMatchObject({ status: 401 })
    expect(spy.mock.calls.some(([u]) => String(u).includes('/auth/refresh'))).toBe(false)
  })
})
