import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { signupSchema, type SignupInput } from '../../lib/validation/auth'
import { ApiError } from '../../lib/api/client'
import { AuthLayout } from '../../components/AuthLayout'
import { MailIcon } from '../../components/Brand'
import { useAuth } from './AuthContext'
import { TextField } from './components/TextField'
import { PasswordField } from './components/PasswordField'
import { emailMemory } from './useEmailMemory'

export function SignupPage() {
  const { signup } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const { register, handleSubmit, watch, setError, getValues, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: emailMemory.get(), password: '', confirmPassword: '', terms: false },
  })
  const password = watch('password')

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      await signup({ name: v.name.trim(), email: v.email.trim().toLowerCase(), password: v.password })
      setDone(true)
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) {
        for (const [k, m] of Object.entries(e.fieldErrors)) setError(k as keyof SignupInput, { message: m }, { shouldFocus: true })
      } else setFormError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    }
  })

  if (done) {
    const email = getValues('email').trim().toLowerCase()
    return (
      <AuthLayout>
        <div className="stack" style={{ alignItems: 'flex-start' }}>
          <div className="icon-tile"><MailIcon /></div>
          <div>
            <h1 className="page-title">Check your email</h1>
            <p className="page-sub" role="status">Account created. We sent a verification link to <strong>{email}</strong>.</p>
          </div>
          <Link className="btn btn-primary btn-block" to={`/verify-email?email=${encodeURIComponent(email)}`}>Verify your email</Link>
          <p className="fineprint"><Link className="link" to="/login">Go to sign in</Link></p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="stack">
        <div>
          <h1 className="page-title">Create your account</h1>
          <p className="page-sub">Free to start. No card required.</p>
        </div>
        {formError && <div role="alert" className="alert alert-error">{formError}</div>}
        <form onSubmit={onSubmit} noValidate className="stack" style={{ gap: 16 }}>
          <TextField label="Full name" autoComplete="name" placeholder="Alex Morgan" error={errors.name?.message} {...register('name')} />
          <TextField label="Work email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
          <PasswordField label="Password" autoComplete="new-password" placeholder="At least 12 characters" meterValue={password} error={errors.password?.message} {...register('password')} />
          <PasswordField label="Confirm password" autoComplete="new-password" placeholder="Re-enter your password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          <div className="field-group">
            <label className="check"><input type="checkbox" aria-invalid={!!errors.terms} {...register('terms')} /> I agree to the Terms and Privacy Policy</label>
            {errors.terms && <p className="field-error" role="alert"><span aria-hidden="true">⚠ </span>{errors.terms.message}</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="fineprint">Already have an account? <Link className="link" to="/login" onClick={() => emailMemory.set(getValues('email'))}>Sign in</Link></p>
      </div>
    </AuthLayout>
  )
}
