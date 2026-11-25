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

export async function api<T>(path: string, init: RequestInit & { json?: unknown; auth?: boolean } = {}): Promise<T> {
  const { json, auth = true, headers, ...rest } = init
  const h = new Headers(headers)
  if (json !== undefined) h.set('Content-Type', 'application/json')
  const at = tokens.getAccess()
  if (auth && at) h.set('Authorization', `Bearer ${at}`)
  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...rest, headers: h, body: json !== undefined ? JSON.stringify(json) : rest.body })
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.')
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const ra = Number(res.headers.get('Retry-After')) || undefined
    throw new ApiError(res.status, body?.message ?? 'Something went wrong', { fieldErrors: body?.fieldErrors, retryAfter: ra })
  }
  return body as T
}
