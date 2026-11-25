// Multi-tab sync. Messages carry only an event type and a tab id, never tokens.
export type TabMessage = 'login' | 'logout'

const CHANNEL = 'auth-sync'
const supported = typeof BroadcastChannel !== 'undefined'
// A BroadcastChannel instance in the same page also receives messages posted by other instances
// in that page, so each message is tagged and our own are ignored.
export const TAB_ID = typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Math.random())

export function broadcast(type: TabMessage) {
  if (!supported) return
  const ch = new BroadcastChannel(CHANNEL)
  ch.postMessage({ type, from: TAB_ID })
  ch.close()
}

export function onTabMessage(fn: (msg: TabMessage) => void): () => void {
  if (!supported) return () => {}
  const ch = new BroadcastChannel(CHANNEL)
  ch.onmessage = (e: MessageEvent<{ type?: string; from?: string }>) => {
    const { type, from } = e.data ?? {}
    if (from === TAB_ID) return
    if (type === 'login' || type === 'logout') fn(type)
  }
  return () => ch.close()
}
