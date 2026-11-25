import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { loginSchema, type LoginInput } from '../../lib/validation/auth'
import { safeRedirect } from '../../lib/redirect'
import { ApiError } from '../../lib/api/client'
import { useAuth } from './AuthContext'
import { TextField } from './components/TextField'
import { PasswordField } from './components/PasswordField'
import { emailMemory } from './useEmailMemory'
import { notice } from './notice'

export function LoginPage() {
  const { login } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirect = safeRedirect(params.get('redirect'))
  const [formError, setFormError] = useState<string | null>(null)
  const [inactivity] = useState(() => notice.peek())
  useEffect(() => notice.clear(), [])
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: emailMemory.get(), password: '', remember: false },
    shouldFocusError: true,
  })

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      await login(v.email.trim().toLowerCase(), v.password, v.remember)
      navigate(redirect, { replace: true })
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    }
  })

  const rememberEmail = () => emailMemory.set(getValues('email'))

  return (
    <main className="card">
      <h1>Log in</h1>
      {inactivity === 'idle' && <div role="status" className="alert warn">You were logged out due to inactivity.</div>}
      {inactivity === 'other-tab' && <div role="status" className="alert warn">You were logged out in another tab.</div>}
      {params.get('expired') &&<div role="status" className="alert warn">Your session expired. Please log in again.</div>}
      {formError && <div role="alert" className="alert err">{formError}</div>}
      <form onSubmit={onSubmit} noValidate>
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <label className="check"><input type="checkbox" {...register('remember')} /> Remember me</label>
        <button type="submit" className="primary" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="links">
        <Link to="/forgot-password" onClick={rememberEmail}>Forgot password?</Link>
        {' · '}
        <Link to="/signup" onClick={rememberEmail}>Create an account</Link>
      </p>
      <details className="demo"><summary>Demo accounts (mock only)</summary>
        <p>user@example.test · admin@example.test · unverified@example.test · locked@example.test<br />Password: Password-1234!</p>
      </details>
    </main>
  )
}
