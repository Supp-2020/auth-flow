import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string }

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField({ label, error, ...input }, ref) {
  const id = useId(), errId = `${id}-err`
  return (
    <div className="field-group">
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} ref={ref} className="field" aria-invalid={!!error} aria-describedby={error ? errId : undefined} {...input} />
      <p id={errId} className="field-error" aria-live="polite">{error ? <><span aria-hidden="true">⚠ </span>{error}</> : null}</p>
    </div>
  )
})
