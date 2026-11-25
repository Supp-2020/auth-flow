import { useSyncExternalStore } from 'react'

// Tiny in-memory log of recent API calls for the dashboard's "Mock API log" panel.
// Records method, path and status only: never tokens, headers or bodies.
let entries: string[] = []
const listeners = new Set<() => void>()

export function logRequest(method: string, path: string, status: number | 'network error', note = '') {
  entries = [`${method} ${path} ${status}${note ? ` ${note}` : ''}`, ...entries].slice(0, 6)
  listeners.forEach((l) => l())
}

export function clearRequestLog() {
  entries = []
  listeners.forEach((l) => l())
}

export function useRequestLog(): string[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => entries,
  )
}
