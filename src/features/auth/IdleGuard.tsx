import { useEffect, useRef } from 'react'
import { refreshAccessToken } from '../../lib/api/refresh'
import { useAuth } from './AuthContext'
import { notice } from './notice'
import { useIdleTimeout } from './useIdleTimeout'

function readMs(key: string, fallback: number) {
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) && v > 0 ? v : fallback
  } catch { return fallback }
}

/** Warns before an inactivity logout. Defaults: 5 min idle, then a 60 s warning (override via localStorage for demos). */
export function IdleGuard() {
  const { logout } = useAuth()
  const { secondsLeft, stay } = useIdleTimeout({
    idleMs: readMs('dev.idleMs', 5 * 60_000),
    warnMs: readMs('dev.warnMs', 60_000),
    onTimeout: () => { notice.set('idle'); void logout() },
  })
  const stayRef = useRef<HTMLButtonElement>(null)
  const open = secondsLeft !== null

  useEffect(() => { if (open) stayRef.current?.focus() }, [open])

  if (!open) return null

  const keepAlive = () => { stay(); refreshAccessToken().catch(() => { /* a later request will retry */ }) }
  // Keep Tab inside the dialog.
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const items = e.currentTarget.querySelectorAll<HTMLButtonElement>('button')
    const first = items[0], lastEl = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus() }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus() }
  }

  return (
    <div className="modal-backdrop">
      <div role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-desc" className="card modal" onKeyDown={trap}>
        <h2 id="idle-title">Are you still there?</h2>
        <p id="idle-desc">You'll be logged out in {secondsLeft}s because of inactivity.</p>
        <button ref={stayRef} type="button" className="primary" onClick={keepAlive}>Stay signed in</button>
        <button type="button" onClick={() => { void logout() }}>Log out now</button>
      </div>
    </div>
  )
}
