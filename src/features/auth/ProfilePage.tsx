import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from '../../lib/validation/auth'
import { api, ApiError } from '../../lib/api/client'
import { useAuth } from './AuthContext'
import { TextField } from './components/TextField'
import { PasswordField } from './components/PasswordField'
import type { User } from './types'

function NameForm({ user }: { user: User }) {
  const qc = useQueryClient()
  const { updateUser } = useAuth()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
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
    <form onSubmit={onSubmit} noValidate aria-labelledby="profile-h">
      <h2 id="profile-h">Profile</h2>
      <p>Email: {user.email}</p>
      <TextField label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <div role={msg?.ok === false ? 'alert' : 'status'} className={msg ? `alert ${msg.ok ? 'ok' : 'err'}` : undefined}>{msg?.text}</div>
      <button type="submit" className="primary" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save name'}</button>
    </form>
  )
}

function PasswordForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
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
    <form onSubmit={onSubmit} noValidate aria-labelledby="pw-h">
      <h2 id="pw-h">Change password</h2>
      <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
      <PasswordField label="New password" autoComplete="new-password" meterValue={watch('newPassword')} error={errors.newPassword?.message} {...register('newPassword')} />
      <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      <div role={msg?.ok === false ? 'alert' : 'status'} className={msg ? `alert ${msg.ok ? 'ok' : 'err'}` : undefined}>{msg?.text}</div>
      <button type="submit" className="primary" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Saving…' : 'Change password'}</button>
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
    try { await api('/auth/logout-all', { method: 'POST' }) } catch { /* fall through: still log out here */ }
    await logout()
  }

  return (
    <main className="card">
      <h1>Settings</h1>
      {isPending && !user && <p aria-busy="true">Loading…</p>}
      {user && <NameForm user={user} />}
      <hr />
      <PasswordForm />
      <hr />
      <button type="button" onClick={() => void logout()}>Log out</button>{' '}
      <button type="button" onClick={() => void logoutAll()} disabled={busy}>Log out of all devices</button>
      <p><Link to="/dashboard">Back to dashboard</Link></p>
    </main>
  )
}
