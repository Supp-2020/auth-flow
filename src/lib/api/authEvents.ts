export type AuthEvent = 'session-expired' | 'token-refreshed'

const target = new EventTarget()

export const authEvents = {
  emit: (e: AuthEvent) => target.dispatchEvent(new Event(e)),
  on(e: AuthEvent, fn: () => void) {
    target.addEventListener(e, fn)
    return () => target.removeEventListener(e, fn)
  },
}
