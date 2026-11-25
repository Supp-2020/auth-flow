import { refreshAccessToken, RefreshError } from './refresh'
import { logRequest } from './requestLog'
import { tokens } from './tokens'

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>
  retryAfter?: number
  constructor(status: number, message: string, extra: { fieldErrors?: Record<string, string>; retryAfter?: number } = {}) {
    super(message)
    this.status = status
    Object.assign(this, extra)
  }
}

type Options = RequestInit & { json?: unknown; auth?: boolean }

async function send(path: string, { json, auth = true, headers, ...rest }: Options, accessToken: string | null): Promise<Response> {
  const h = new Headers(headers)
  if (json !== undefined) h.set('Content-Type', 'application/json')
  if (auth && accessToken) h.set('Authorization', `Bearer ${accessToken}`)
  const method = (rest.method ?? 'GET').toUpperCase()
  try {
    const res = await fetch(new URL(`/api${path}`, location.origin).href, {
      ...rest,
      headers: h,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
    logRequest(method, `/api${path}`, res.status)
    return res
  } catch {
    logRequest(method, `/api${path}`, 'network error')
    throw new ApiError(0, 'Network error. Check your connection and try again.')
  }
}

/**
 * Fetch wrapper: attaches the access token and, on a 401 for an authenticated call,
 * silently refreshes (single-flight) and retries the original request once.
 */
export async function api<T>(path: string, init: Options = {}): Promise<T> {
  const auth = init.auth ?? true
  const usedToken = tokens.getAccess()
  let res = await send(path, init, usedToken)

  if (res.status === 401 && auth && tokens.getRefresh()) {
    try {
      // If another request already refreshed while this one was in flight, just retry with the new token.
      const current = tokens.getAccess()
      const fresh = current && current !== usedToken ? current : await refreshAccessToken()
      res = await send(path, init, fresh)
    } catch (e) {
      if (e instanceof RefreshError && e.fatal) throw new ApiError(401, 'Your session expired. Please log in again.')
      if (e instanceof RefreshError) throw new ApiError(0, 'Could not refresh your session. Check your connection and try again.')
      throw e
    }
  }

  const body = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const ra = Number(res.headers.get('Retry-After')) || undefined
    throw new ApiError(res.status, body?.message ?? 'Something went wrong', { fieldErrors: body?.fieldErrors, retryAfter: ra })
  }
  return body as T
}
