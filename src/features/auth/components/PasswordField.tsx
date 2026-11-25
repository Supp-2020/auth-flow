import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { MIN_PASSWORD_LENGTH, passwordRules, passwordStrength } from '../../../lib/validation/auth'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  /** When set, shows the strength meter and live rules checklist for this value. */
  meterValue?: string
  /** Optional extra content on the label row (e.g. a "Forgot password?" link). */
  labelAside?: ReactNode
}

const STRENGTH = ['not set', 'Weak', 'Fair', 'Good', 'Strong']

export const PasswordField = forwardRef<HTMLInputElement, Props>(function PasswordField({ label, error, meterValue, labelAside, ...input }, ref) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const errId = `${id}-err`, hintId = `${id}-rules`
  const showMeter = meterValue !== undefined
  const v = meterValue ?? ''
  const strength = passwordStrength(v)
  const describedBy = [error && errId, showMeter && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className="field-group">
      <div className="label-row">
        <label className="label" htmlFor={id}>{label}</label>
        {labelAside}
      </div>
      <div className="input-wrap">
        <input id={id} ref={ref} className="field" type={shown ? 'text' : 'password'} aria-invalid={!!error} aria-describedby={describedBy} {...input} />
        <button type="button" className="link toggle" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {showMeter && (
        <div id={hintId} className="field-group" style={{ gap: 8 }}>
          <div className={`meter s${strength}`} role="img" aria-label={`Password strength: ${STRENGTH[strength]}`}><span /><span /><span /><span /></div>
          <span className="hint">Password strength: <strong>{STRENGTH[strength]}</strong>. Use {MIN_PASSWORD_LENGTH}+ characters with a number.</span>
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
      <p id={errId} className="field-error" aria-live="polite">{error ? <><span aria-hidden="true">⚠ </span>{error}</> : null}</p>
    </div>
  )
})
