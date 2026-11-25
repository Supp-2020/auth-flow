import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { loginSchema, type LoginInput } from '../../lib/validation/auth'
import { safeRedirect } from '../../lib/redirect'
import { ApiError } from '../../lib/api/client'
import { AuthLayout } from '../../components/AuthLayout'
import { BRAND_NAME, GoogleIcon } from '../../components/Brand'
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
  const hasRedirect = params.has('redirect') && redirect !== '/dashboard'
  const [formError, setFormError] = useState<string | null>(null)
  const [socialNote, setSocialNote] = useState(false)
  const [inactivity] = useState(() => notice.peek())
  useEffect(() => notice.clear(), [])
  const expired = !!params.get('expired')
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
    <AuthLayout>
      <div className="stack">
        <div>
          <h1 className="page-title">Welcome back</h1>
          <p className="page-sub">Sign in to your {BRAND_NAME} account.</p>
        </div>
        {inactivity === 'idle' && <div role="status" className="alert alert-notice">You were logged out due to inactivity.</div>}
        {inactivity === 'other-tab' && <div role="status" className="alert alert-notice">You were logged out in another tab.</div>}
        {expired
          ? <div role="status" className="alert alert-info">Your session expired for your security. Please sign in again.</div>
          : hasRedirect && <div role="status" className="alert alert-notice">You tried to open <strong>{redirect}</strong>. Sign in and we will take you straight there.</div>}
        <button type="button" className="btn btn-ghost" onClick={() => setSocialNote(true)}><GoogleIcon />Continue with Google</button>
        {socialNote && <div role="status" className="alert alert-info">Social sign-in is only a UI preview in this demo. Use your email and password.</div>}
        <div className="divider" aria-hidden="true">or</div>
        {formError && <div role="alert" className="alert alert-error">{formError}</div>}
        <form onSubmit={onSubmit} noValidate className="stack" style={{ gap: 16 }}>
          <TextField label="Email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            labelAside={<Link className="link" to="/forgot-password" onClick={rememberEmail}>Forgot password?</Link>}
            {...register('password')}
          />
          <label className="check"><input type="checkbox" {...register('remember')} /> Remember me</label>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="fineprint">New to {BRAND_NAME}? <Link className="link" to="/signup" onClick={rememberEmail}>Create an account</Link></p>
        <details className="demo"><summary>Demo accounts (mock only)</summary>
          <p>user@example.test · admin@example.test · unverified@example.test · locked@example.test<br />Password: Password-1234!</p>
        </details>
      </div>
    </AuthLayout>
  )
}
