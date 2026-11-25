import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { passwordRules, passwordStrength } from '../../../lib/validation/auth'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  /** When set, shows the strength meter and live rules checklist for this value. */
  meterValue?: string
}

export const PasswordField = forwardRef<HTMLInputElement, Props>(function PasswordField({ label, error, meterValue, ...input }, ref) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const errId = `${id}-err`, hintId = `${id}-rules`
  const showMeter = meterValue !== undefined
  const v = meterValue ?? ''
  const strength = passwordStrength(v)
  const describedBy = [error && errId, showMeter && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <input id={id} ref={ref} type={shown ? 'text' : 'password'} aria-invalid={!!error} aria-describedby={describedBy} {...input} />
        <button type="button" className="ghost" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {showMeter && (
        <div id={hintId}>
          <div className={`meter s${strength}`} role="img" aria-label={`Password strength: ${['empty', 'weak', 'fair', 'good', 'strong'][strength]}`}><span /></div>
          <ul className="rules">
            {passwordRules.map((r) => {
              const ok = r.test(v)
              return (
                <li key={r.id} className={ok ? 'ok' : ''}>
                  <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.label}
                  <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <p id={errId} className="error" aria-live="polite">{error ? <><span aria-hidden="true">⚠ </span>{error}</> : null}</p>
    </div>
  )
})
