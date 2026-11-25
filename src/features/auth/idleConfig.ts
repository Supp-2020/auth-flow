function readMs(key: string, fallback: number) {
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) && v > 0 ? v : fallback
  } catch { return fallback }
}

/** Defaults: 5 min idle, then a 60 s warning. Override via localStorage (`dev.idleMs`, `dev.warnMs`) for demos/tests. */
export function getIdleConfig() {
  return { idleMs: readMs('dev.idleMs', 5 * 60_000), warnMs: readMs('dev.warnMs', 60_000) }
}

export function formatIdleLimit(ms: number) {
  return ms >= 60_000 ? `${Math.round(ms / 60_000)} min` : `${Math.round(ms / 1000)} s`
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
