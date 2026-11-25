import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { signupSchema, type SignupInput } from '../../lib/validation/auth'
import { ApiError } from '../../lib/api/client'
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
    return (
      <main className="card">
        <h1>Check your email</h1>
        <p role="status">Account created. We sent a verification link to {getValues('email')}.</p>
        <p><Link to={`/verify-email?email=${encodeURIComponent(getValues('email').trim().toLowerCase())}`}>Verify your email</Link></p>
        <p><Link to="/login">Go to log in</Link></p>
      </main>
    )
  }

  return (
    <main className="card">
      <h1>Create account</h1>
      {formError && <div role="alert" className="alert err">{formError}</div>}
      <form onSubmit={onSubmit} noValidate>
        <TextField label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordField label="Password" autoComplete="new-password" meterValue={password} error={errors.password?.message} {...register('password')} />
        <PasswordField label="Confirm password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <label className="check"><input type="checkbox" aria-invalid={!!errors.terms} {...register('terms')} /> I accept the terms</label>
        {errors.terms && <p className="error" role="alert"><span aria-hidden="true">⚠ </span>{errors.terms.message}</p>}
        <button type="submit" className="primary" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="links">Already have an account? <Link to="/login" onClick={() => emailMemory.set(getValues('email'))}>Log in</Link></p>
    </main>
  )
}
