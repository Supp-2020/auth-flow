// Token storage decision (see README): access token lives in memory only;
// refresh token is kept in web storage because MSW cannot set httpOnly cookies.
// "Remember me" => localStorage, otherwise sessionStorage. Never log tokens or put them in URLs.
const KEY = 'auth.refresh'
let accessToken: string | null = null

const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn() } catch { return fallback } }

export const tokens = {
  getAccess: () => accessToken,
  setAccess: (t: string | null) => { accessToken = t },
  getRefresh: (): string | null => safe(() => localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY), null),
  setRefresh(t: string, persist: boolean) {
    safe(() => { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); (persist ? localStorage : sessionStorage).setItem(KEY, t) }, undefined)
  },
  isPersistent: (): boolean => safe(() => localStorage.getItem(KEY) !== null, false),
  clear() {
    accessToken = null
    safe(() => { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY) }, undefined)
  },
}
