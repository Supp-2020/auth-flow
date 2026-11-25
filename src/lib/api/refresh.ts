import { authEvents } from './authEvents'
import { tokens } from './tokens'

export class RefreshError extends Error {
  /** true when the server rejected the refresh token (session is really over); false for network/5xx. */
  readonly fatal: boolean
  constructor(message: string, fatal: boolean) {
    super(message)
    this.fatal = fatal
  }
}

let inflight: Promise<string> | null = null

/**
 * Single-flight refresh: concurrent callers share one /auth/refresh request.
 * Refresh tokens rotate, so a second parallel call would fail and kill the session.
 * Only a server rejection (401/400) ends the session; offline/5xx errors keep it so a retry can succeed.
 */
export function refreshAccessToken(): Promise<string> {
  inflight ??= withCrossTabLock(doRefresh).finally(() => { inflight = null })
  return inflight
}

/** Serialize refreshes across tabs (they share a rotating refresh token in storage). Falls back to no lock. */
function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request('auth-refresh', fn) : fn()
}

async function doRefresh(): Promise<string> {
  const refreshToken = tokens.getRefresh()
  if (!refreshToken) throw expire('No refresh token')
  let res: Response
  try {
    res = await fetch(new URL('/api/auth/refresh', location.origin).href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    throw new RefreshError('Network error while refreshing', false)
  }
  if (res.status === 401 || res.status === 400) throw expire('Refresh token rejected')
  if (!res.ok) throw new RefreshError(`Refresh failed (${res.status})`, false)
  const body = (await res.json()) as { accessToken: string; refreshToken: string }
  tokens.setAccess(body.accessToken)
  tokens.setRefresh(body.refreshToken, tokens.isPersistent())
  authEvents.emit('token-refreshed')
  return body.accessToken
}

function expire(message: string): RefreshError {
  tokens.clear()
  authEvents.emit('session-expired')
  return new RefreshError(message, true)
}
