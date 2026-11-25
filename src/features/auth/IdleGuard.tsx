import { useEffect, useRef } from 'react'
import { ClockIcon } from '../../components/Brand'
import { authEvents } from '../../lib/api/authEvents'
import { refreshAccessToken } from '../../lib/api/refresh'
import { useAuth } from './AuthContext'
import { formatClock, getIdleConfig } from './idleConfig'
import { notice } from './notice'
import { useIdleTimeout } from './useIdleTimeout'

/** Warns before an inactivity logout (design: "Still there?" dialog with a mm:ss countdown). */
export function IdleGuard() {
  const { logout } = useAuth()
  const { idleMs, warnMs } = getIdleConfig()
  const { secondsLeft, stay, triggerWarning } = useIdleTimeout({
    idleMs,
    warnMs,
    onTimeout: () => { notice.set('idle'); void logout() },
  })
  const stayRef = useRef<HTMLButtonElement>(null)
  const open = secondsLeft !== null

  useEffect(() => authEvents.on('demo-idle-warning', triggerWarning), [triggerWarning])
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
      <div role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-desc" className="modal" onKeyDown={trap}>
        <div className="warn-tile"><ClockIcon /></div>
        <h2 id="idle-title">Still there?</h2>
        <p id="idle-desc">Your session ends in <strong>{formatClock(secondsLeft)}</strong> due to inactivity. Stay signed in to keep working.</p>
        <div className="btn-row">
          <button ref={stayRef} type="button" className="btn btn-primary" onClick={keepAlive}>Stay signed in</button>
          <button type="button" className="btn btn-ghost" onClick={() => { void logout() }}>Sign out</button>
        </div>
      </div>
    </div>
  )
}
