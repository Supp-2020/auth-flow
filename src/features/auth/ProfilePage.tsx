import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from '../../lib/validation/auth'
import { api, ApiError } from '../../lib/api/client'
import { AppShell } from '../../components/AppShell'
import { useAuth } from './AuthContext'
import { TextField } from './components/TextField'
import { PasswordField } from './components/PasswordField'
import type { User } from './types'

type Msg = { ok: boolean; text: string } | null
const Feedback = ({ msg }: { msg: Msg }) => (
  <div role={msg?.ok === false ? 'alert' : 'status'} className={msg ? `alert ${msg.ok ? 'alert-success' : 'alert-error'}` : undefined}>{msg?.text}</div>
)

function NameForm({ user }: { user: User }) {
  const qc = useQueryClient()
  const { updateUser } = useAuth()
  const [msg, setMsg] = useState<Msg>(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: { name: user.name },
  })
  const onSubmit = handleSubmit(async (v) => {
    setMsg(null)
    try {
      const { user: u } = await api<{ user: User }>('/me', { method: 'PATCH', json: { name: v.name.trim() } })
      updateUser(u)
      void qc.invalidateQueries({ queryKey: ['me'] })
      setMsg({ ok: true, text: 'Name updated.' })
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors?.name) setError('name', { message: e.fieldErrors.name }, { shouldFocus: true })
      else setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Something went wrong.' })
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="profile-h" className="panel stack" style={{ gap: 14 }}>
      <h2 id="profile-h" style={{ fontSize: 18 }}>Profile</h2>
      <p className="page-sub" style={{ fontSize: 14 }}>Email: {user.email}</p>
      <TextField label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <Feedback msg={msg} />
      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save name'}</button>
    </form>
  )
}

function PasswordForm() {
  const [msg, setMsg] = useState<Msg>(null)
  const { register, handleSubmit, watch, reset, setError, formState: { errors, isSubmitting } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const onSubmit = handleSubmit(async (v) => {
    setMsg(null)
    try {
      await api('/auth/change-password', { method: 'POST', json: { currentPassword: v.currentPassword, newPassword: v.newPassword } })
      reset()   // never keep passwords in form state longer than needed
      setMsg({ ok: true, text: 'Password changed.' })
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors?.currentPassword) setError('currentPassword', { message: e.fieldErrors.currentPassword }, { shouldFocus: true })
      else setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Something went wrong.' })
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="pw-h" className="panel stack" style={{ gap: 14 }}>
      <h2 id="pw-h" style={{ fontSize: 18 }}>Change password</h2>
      <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
      <PasswordField label="New password" autoComplete="new-password" meterValue={watch('newPassword')} error={errors.newPassword?.message} {...register('newPassword')} />
      <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      <Feedback msg={msg} />
      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Saving…' : 'Change password'}</button>
    </form>
  )
}

export function ProfilePage() {
  const { logout, user: ctxUser } = useAuth()
  const { data, isPending } = useQuery({ queryKey: ['me'], queryFn: () => api<{ user: User }>('/me') })
  const user = data?.user ?? ctxUser
  const [busy, setBusy] = useState(false)

  const logoutAll = async () => {
    setBusy(true)
    try { await api('/auth/logout-all', { method: 'POST' }) } catch { /* fall through: still sign out here */ }
    await logout()
  }

  return (
    <AppShell>
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your profile and sign-in details.</p>
      </div>
      <div className="settings-card">
        {isPending && !user && <p aria-busy="true">Loading…</p>}
        {user && <NameForm user={user} />}
        <PasswordForm />
        <div className="panel stack" style={{ gap: 14 }}>
          <h2 style={{ fontSize: 18 }}>Sessions</h2>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => void logout()}>Sign out</button>
            <button type="button" className="btn btn-ghost" onClick={() => void logoutAll()} disabled={busy}>Sign out of all devices</button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
