/** Allow only relative, same-origin paths to prevent open redirects. */
export function safeRedirect(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target) return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return fallback
  try {
    const u = new URL(target, window.location.origin)
    if (u.origin !== window.location.origin) return fallback
  } catch {
    return fallback
  }
  return target
}
