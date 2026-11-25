import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api/client'
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
    <main className="card">
      <h1>Email verification</h1>
      {q.isPending && <p role="status" aria-busy="true">Verifying…</p>}
      {q.isSuccess && <p role="status">Your email is verified. <Link to="/login">Log in</Link></p>}
      {q.isError && (
        <div role="alert" className="alert err">
          {q.error instanceof ApiError ? q.error.message : 'Could not verify your email.'}
        </div>
      )}
    </main>
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
    <main className="card">
      <h1>Verify your email</h1>
      <p>We sent a verification link{email ? <> to <strong>{email}</strong></> : null}. Open it to finish setting up your account.</p>
      <p className="demo">Mock app: find the link in the <Link to="/mock-inbox">mock inbox</Link>.</p>
      {resend.isSuccess && <p role="status">If that account needs verification, we sent another email.</p>}
      {resend.isError && <div role="alert" className="alert err">Could not resend. Try again.</div>}
      <button type="button" className="primary" disabled={!email || resend.isPending || cooldown > 0} onClick={() => resend.mutate()}>
        {resend.isPending ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend email'}
      </button>
      <p className="links"><Link to="/login">Back to log in</Link></p>
    </main>
  )
}

export function VerifyEmailPage() {
  const token = useSearchParams()[0].get('token')
  return token ? <VerifyWithToken token={token} /> : <VerifyPrompt />
}
