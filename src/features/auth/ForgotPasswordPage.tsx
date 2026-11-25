import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { forgotSchema, type ForgotInput } from '../../lib/validation/auth'
import { api, ApiError } from '../../lib/api/client'
import { AuthLayout } from '../../components/AuthLayout'
import { MailIcon } from '../../components/Brand'
import { TextField } from './components/TextField'
import { emailMemory } from './useEmailMemory'

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    mode: 'onTouched',
    defaultValues: { email: emailMemory.get() },
  })

  const send = async (email: string) => {
    setFormError(null)
    try {
      await api('/auth/forgot-password', { method: 'POST', json: { email: email.trim().toLowerCase() }, auth: false })
      emailMemory.set(email)
      setSentTo(email.trim().toLowerCase())
      return true
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
      return false
    }
  }
  const onSubmit = handleSubmit(async (v) => { await send(v.email) })

  if (sentTo) {
    return (
      <AuthLayout>
        <div className="stack" style={{ alignItems: 'flex-start' }}>
          <div className="icon-tile"><MailIcon /></div>
          <div>
            <h1 className="page-title">Check your inbox</h1>
            <p className="page-sub" role="status">If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It expires in 30 minutes.</p>
          </div>
          <Link className="btn btn-primary btn-block" to="/login">Back to sign in</Link>
          <p className="fineprint">
            Did not get it?{' '}
            <button type="button" className="link" onClick={async () => { if (await send(sentTo)) setResent(true) }}>Resend email</button>
          </p>
          {resent && <div role="status" className="alert alert-success">Sent again. Check your inbox.</div>}
          <p className="demo">Mock app: open the <Link to="/mock-inbox">mock inbox</Link> to see the email.</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="stack">
        <Link className="link" style={{ alignSelf: 'flex-start', textDecoration: 'none' }} to="/login" onClick={() => emailMemory.set(getValues('email'))}>← Back to sign in</Link>
        <div>
          <h1 className="page-title">Reset your password</h1>
          <p className="page-sub">Enter your email and we will send you a reset link.</p>
        </div>
        {formError && <div role="alert" className="alert alert-error">{formError}</div>}
        <form onSubmit={onSubmit} noValidate className="stack" style={{ gap: 16 }}>
          <TextField label="Email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
          <button type="submit" className="btn btn-primary" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
