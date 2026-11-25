import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { resetSchema, type ResetInput } from '../../lib/validation/auth'
import { api, ApiError } from '../../lib/api/client'
import { AuthLayout } from '../../components/AuthLayout'
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
      <AuthLayout>
        <div className="stack">
          <h1 className="page-title">Reset link problem</h1>
          <div role="alert" className="alert alert-error">This reset link is missing its token.</div>
          <Link className="btn btn-primary" to="/forgot-password">Request a new link</Link>
        </div>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="stack">
          <div>
            <h1 className="page-title">Password updated</h1>
            <p className="page-sub" role="status">You can now sign in with your new password. Other devices were signed out.</p>
          </div>
          <Link className="btn btn-primary" to="/login">Go to sign in</Link>
        </div>
      </AuthLayout>
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
    <AuthLayout>
      <div className="stack">
        <div>
          <h1 className="page-title">Choose a new password</h1>
          <p className="page-sub">Pick something you have not used before.</p>
        </div>
        {formError && (
          <div role="alert" className="alert alert-error">
            {formError} <Link to="/forgot-password">Request a new link</Link>
          </div>
        )}
        <form onSubmit={onSubmit} noValidate className="stack" style={{ gap: 16 }}>
          <PasswordField label="New password" autoComplete="new-password" meterValue={password} error={errors.password?.message} {...register('password')} />
          <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          <button type="submit" className="btn btn-primary" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
