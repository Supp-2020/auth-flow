// One-shot, non-sensitive message to show on the login page (e.g. signed out due to inactivity).
const KEY = 'auth.notice'
export type Notice = 'idle' | 'other-tab'

export const notice = {
  set(n: Notice) { try { sessionStorage.setItem(KEY, n) } catch { /* ignore */ } },
  /** Read without clearing (safe under StrictMode's double render). */
  peek(): Notice | null {
    try { return sessionStorage.getItem(KEY) as Notice | null } catch { return null }
  },
  clear() { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } },
}
