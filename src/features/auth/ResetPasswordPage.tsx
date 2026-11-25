import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { resetSchema, type ResetInput } from '../../lib/validation/auth'
import { api, ApiError } from '../../lib/api/client'
import { PasswordField } from './components/PasswordField'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  })
  const password = watch('password')

  if (!token) {
    return (
      <main className="card">
        <h1>Reset link problem</h1>
        <div role="alert" className="alert err">This reset link is missing its token.</div>
        <p><Link to="/forgot-password">Request a new link</Link></p>
      </main>
    )
  }

  if (done) {
    return (
      <main className="card">
        <h1>Password updated</h1>
        <p role="status">You can now log in with your new password. Other devices were signed out.</p>
        <p><Link to="/login">Go to log in</Link></p>
      </main>
    )
  }

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      await api('/auth/reset-password', { method: 'POST', json: { token, password: v.password }, auth: false })
      setDone(true)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    }
  })

  return (
    <main className="card">
      <h1>Choose a new password</h1>
      {formError && (
        <div role="alert" className="alert err">
          {formError} <Link to="/forgot-password">Request a new link</Link>
        </div>
      )}
      <form onSubmit={onSubmit} noValidate>
        <PasswordField label="New password" autoComplete="new-password" meterValue={password} error={errors.password?.message} {...register('password')} />
        <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <button type="submit" className="primary" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </main>
  )
}
