import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const

interface Options {
  /** inactivity before the warning appears */
  idleMs: number
  /** how long the warning shows before timing out */
  warnMs: number
  onTimeout: () => void
  enabled?: boolean
}

/** Returns `secondsLeft` while the warning is showing (null otherwise), `stay()` to dismiss it, and `triggerWarning()` for demos. */
export function useIdleTimeout({ idleMs, warnMs, onTimeout, enabled = true }: Options) {
  const last = useRef(Date.now())
  const warned = useRef(false)
  const timeoutRef = useRef(onTimeout)
  timeoutRef.current = onTimeout
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const stay = useCallback(() => {
    last.current = Date.now()
    warned.current = false
    setSecondsLeft(null)
  }, [])

  /** Show the warning now, as if the idle period had just elapsed. */
  const triggerWarning = useCallback(() => {
    last.current = Date.now() - idleMs
    warned.current = true
    setSecondsLeft(Math.ceil(warnMs / 1000))
  }, [idleMs, warnMs])

  useEffect(() => {
    if (!enabled) return
    last.current = Date.now()
    warned.current = false
    // Once the warning is up, only the explicit button dismisses it.
    const onActivity = () => { if (!warned.current) last.current = Date.now() }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    const tick = setInterval(() => {
      const idleFor = Date.now() - last.current
      if (idleFor < idleMs) return
      warned.current = true
      const remaining = warnMs - (idleFor - idleMs)
      if (remaining <= 0) {
        clearInterval(tick)
        warned.current = false
        setSecondsLeft(null)
        timeoutRef.current()
      } else {
        setSecondsLeft(Math.ceil(remaining / 1000))
      }
    }, 1000)
    return () => {
      clearInterval(tick)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [enabled, idleMs, warnMs])

  return { secondsLeft, stay, triggerWarning }
}
