import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api/client'
import { AuthLayout } from '../../components/AuthLayout'
import { MailIcon } from '../../components/Brand'
import { emailMemory } from './useEmailMemory'
import { useAuth } from './AuthContext'

const COOLDOWN_S = 30

function VerifyWithToken({ token }: { token: string }) {
  // useQuery dedupes by key, so StrictMode's double render can't consume the one-time token twice.
  const q = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => api('/auth/verify-email', { method: 'POST', json: { token }, auth: false }),
    staleTime: Infinity,
    gcTime: Infinity,
  })
  return (
    <AuthLayout>
      <div className="stack">
        <h1 className="page-title">Email verification</h1>
        {q.isPending && <p className="page-sub" role="status" aria-busy="true">Verifying…</p>}
        {q.isSuccess && (
          <>
            <p className="page-sub" role="status">Your email is verified.</p>
            <Link className="btn btn-primary" to="/login">Sign in</Link>
          </>
        )}
        {q.isError && (
          <div role="alert" className="alert alert-error">
            {q.error instanceof ApiError ? q.error.message : 'Could not verify your email.'}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}

function VerifyPrompt() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const email = user?.email ?? params.get('email') ?? emailMemory.get()
  const [cooldown, setCooldown] = useState(0)
  const resend = useMutation({
    mutationFn: () => api('/auth/resend-verification', { method: 'POST', json: { email }, auth: false }),
    onSuccess: () => setCooldown(COOLDOWN_S),
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  return (
    <AuthLayout>
      <div className="stack" style={{ alignItems: 'flex-start' }}>
        <div className="icon-tile"><MailIcon /></div>
        <div>
          <h1 className="page-title">Verify your email</h1>
          <p className="page-sub">We sent a verification link{email ? <> to <strong>{email}</strong></> : null}. Open it to finish setting up your account.</p>
        </div>
        <p className="demo">Mock app: find the link in the <Link to="/mock-inbox">mock inbox</Link>.</p>
        {resend.isSuccess && <div role="status" className="alert alert-success">If that account needs verification, we sent another email.</div>}
        {resend.isError && <div role="alert" className="alert alert-error">Could not resend. Try again.</div>}
        <button type="button" className="btn btn-primary btn-block" disabled={!email || resend.isPending || cooldown > 0} onClick={() => resend.mutate()}>
          {resend.isPending ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend email'}
        </button>
        <p className="fineprint"><Link className="link" to="/login">Back to sign in</Link></p>
      </div>
    </AuthLayout>
  )
}

export function VerifyEmailPage() {
  const token = useSearchParams()[0].get('token')
  return token ? <VerifyWithToken token={token} /> : <VerifyPrompt />
}
