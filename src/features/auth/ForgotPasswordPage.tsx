import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { forgotSchema, type ForgotInput } from '../../lib/validation/auth'
import { api, ApiError } from '../../lib/api/client'
import { TextField } from './components/TextField'
import { emailMemory } from './useEmailMemory'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    mode: 'onTouched',
    defaultValues: { email: emailMemory.get() },
  })

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      await api('/auth/forgot-password', { method: 'POST', json: { email: v.email.trim().toLowerCase() }, auth: false })
      emailMemory.set(v.email)
      setSent(true)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    }
  })

  if (sent) {
    return (
      <main className="card">
        <h1>Check your inbox</h1>
        <p role="status">If that account exists, we sent an email with a link to reset your password.</p>
        <p className="demo">Mock app: open the <Link to="/mock-inbox">mock inbox</Link> to see it.</p>
        <p><Link to="/login">Back to log in</Link></p>
      </main>
    )
  }

  return (
    <main className="card">
      <h1>Forgot password</h1>
      <p>Enter your email and we'll send a reset link.</p>
      {formError && <div role="alert" className="alert err">{formError}</div>}
      <form onSubmit={onSubmit} noValidate>
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <button type="submit" className="primary" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="links"><Link to="/login" onClick={() => emailMemory.set(getValues('email'))}>Back to log in</Link></p>
    </main>
  )
}
