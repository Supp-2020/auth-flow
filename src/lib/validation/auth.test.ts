import { loginSchema, signupSchema, forgotSchema, resetSchema, passwordStrength } from './auth'
import { safeRedirect } from '../redirect'

const valid = { name: 'Test User', email: '  USER@Example.Test ', password: 'Str0ng-Password!', confirmPassword: 'Str0ng-Password!', terms: true }

describe('signupSchema', () => {
  it('trims and lowercases email', () => {
    const r = signupSchema.safeParse(valid)
    expect(r.success && r.data.email).toBe('user@example.test')
  })
  it('rejects mismatched confirm password on the confirm field', () => {
    const r = signupSchema.safeParse({ ...valid, confirmPassword: 'nope' })
    expect(!r.success && r.error.issues[0].path).toEqual(['confirmPassword'])
  })
  it('rejects short passwords and unchecked terms', () => {
    expect(signupSchema.safeParse({ ...valid, password: 'Short1!', confirmPassword: 'Short1!' }).success).toBe(false)
    expect(signupSchema.safeParse({ ...valid, terms: false }).success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('requires a valid email', () => {
    expect(loginSchema.safeParse({ email: 'bad', password: 'x', remember: false }).success).toBe(false)
  })
})

describe('forgot/reset schemas', () => {
  it('normalizes the forgot-password email', () => {
    const r = forgotSchema.safeParse({ email: ' A@B.Test ' })
    expect(r.success && r.data.email).toBe('a@b.test')
  })
  it('requires matching, strong new passwords', () => {
    expect(resetSchema.safeParse({ password: 'Str0ng-Password!', confirmPassword: 'Str0ng-Password!' }).success).toBe(true)
    expect(resetSchema.safeParse({ password: 'Str0ng-Password!', confirmPassword: 'x' }).success).toBe(false)
    expect(resetSchema.safeParse({ password: 'weak', confirmPassword: 'weak' }).success).toBe(false)
  })
})

describe('passwordStrength', () => {
  it('scales from 0 to 4', () => {
    expect(passwordStrength('')).toBe(0)
    expect(passwordStrength('abc')).toBeGreaterThanOrEqual(1)
    expect(passwordStrength('Str0ng-Password!')).toBe(4)
  })
})

describe('safeRedirect', () => {
  it('allows internal paths only', () => {
    expect(safeRedirect('/settings')).toBe('/settings')
    expect(safeRedirect('//evil.test')).toBe('/dashboard')
    expect(safeRedirect('https://evil.test')).toBe('/dashboard')
    expect(safeRedirect('/\\evil.test')).toBe('/dashboard')
    expect(safeRedirect(null)).toBe('/dashboard')
  })
})
