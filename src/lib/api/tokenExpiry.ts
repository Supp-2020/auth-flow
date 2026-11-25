/** Read the `exp` claim (seconds since epoch) from a JWT-shaped token. UX hint only; the server decides validity. */
export function decodeExp(token: string | null): number | null {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp === 'number' ? exp : null
  } catch {
    return null
  }
}

/** Milliseconds until we should proactively refresh: `leadMs` before expiry, never less than `minMs`. */
export function msUntilRefresh(token: string | null, now = Date.now(), leadMs = 10_000, minMs = 1_000): number | null {
  const exp = decodeExp(token)
  if (exp === null) return null
  return Math.max(minMs, exp * 1000 - now - leadMs)
}

export function isExpired(token: string | null, now = Date.now()): boolean {
  const exp = decodeExp(token)
  return exp === null ? true : exp * 1000 <= now
}
