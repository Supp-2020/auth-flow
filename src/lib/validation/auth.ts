import { z } from 'zod'

export const MIN_PASSWORD_LENGTH = 12

export const passwordRules = [
  { id: 'length', label: `At least ${MIN_PASSWORD_LENGTH} characters`, test: (v: string) => v.length >= MIN_PASSWORD_LENGTH },
  { id: 'lower', label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'upper', label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'number', label: 'A number', test: (v: string) => /\d/.test(v) },
  { id: 'symbol', label: 'A symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const

/** 0 (empty) .. 4 (strong) */
export function passwordStrength(v: string): number {
  if (!v) return 0
  const passed = passwordRules.filter((r) => r.test(v)).length
  const bonus = v.length >= 16 ? 1 : 0
  return Math.min(4, Math.max(1, passed - 1 + bonus))
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'))

export const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .refine((v) => passwordRules.every((r) => r.test(v)), 'Password does not meet all the rules')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
})

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    terms: z.boolean().refine((v) => v, 'You must accept the terms'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const forgotSchema = z.object({ email: emailSchema })

export const resetSchema = z
  .object({ password: newPasswordSchema, confirmPassword: z.string().min(1, 'Confirm your password') })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })

export const profileSchema = z.object({ name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80) })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'New password must be different' })

export type ProfileInput = z.input<typeof profileSchema>
export type ChangePasswordInput = z.input<typeof changePasswordSchema>
export type ForgotInput = z.input<typeof forgotSchema>
export type ResetInput = z.input<typeof resetSchema>
export type LoginInput = z.input<typeof loginSchema>
export type SignupInput = z.input<typeof signupSchema>
