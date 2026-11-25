import { expect, test } from '@playwright/test'
import { ADMIN, login, USER } from './helpers'

test('sign up, verify email from the mock inbox, then log in', async ({ page }) => {
  const email = `new-${Date.now()}@example.test`
  const password = 'Str0ng-Password!'
  await page.goto('/signup')
  await page.getByLabel('Name').fill('New Person')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByLabel(/accept the terms/i).check()
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()

  await page.goto('/mock-inbox')
  await page.getByRole('link', { name: 'Open link' }).first().click()
  await expect(page.getByText('Your email is verified.')).toBeVisible()

  await login(page, { email, password })
  await expect(page.getByText('New Person')).toBeVisible()
})

test('signing up with an existing email shows a field error', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Name').fill('Dup')
  await page.getByLabel('Email').fill(USER.email)
  await page.getByLabel('Password', { exact: true }).fill('Str0ng-Password!')
  await page.getByLabel('Confirm password').fill('Str0ng-Password!')
  await page.getByLabel(/accept the terms/i).check()
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page.getByText('Email already registered')).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
})

test('protected page redirects to login, then back after sign-in', async ({ page }) => {
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings/)
  await page.getByLabel('Email').fill(USER.email)
  await page.getByLabel('Password', { exact: true }).fill(USER.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page).toHaveURL(/\/settings$/)
})

test('login ignores an open-redirect target', async ({ page }) => {
  await page.goto('/login?redirect=https://evil.test')
  await page.getByLabel('Email').fill(USER.email)
  await page.getByLabel('Password', { exact: true }).fill(USER.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/localhost:\d+\/dashboard$/)
})

test('bad credentials show a generic error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(USER.email)
  await page.getByLabel('Password', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid email or password')
})

test('session survives a reload when remembered', async ({ page }) => {
  await login(page, USER, { remember: true })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('expired session (refresh rejected) redirects to login with a message', async ({ page }) => {
  await login(page)
  await expect(page.getByText(/Signed in as/)).toBeVisible()   // let the dashboard's own /me settle first
  // Simulate server-side revocation, and an access token that has stopped working.
  await page.evaluate(async () => {
    const db = await import('/src/mocks/db.ts')
    db.refreshTokens.clear()
    db.persistDb()                         // the mock reloads shared state from storage on each request
    const t = await import('/src/lib/api/tokens.ts')
    t.tokens.setAccess('expired')
  })
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/\/login\?expired=1/)
  await expect(page.getByText('Your session expired. Please log in again.')).toBeVisible()
})

test('a silent refresh keeps the user signed in', async ({ page }) => {
  await login(page)
  await expect(page.getByText(/Signed in as/)).toBeVisible()
  await page.evaluate(async () => {
    const t = await import('/src/lib/api/tokens.ts')
    t.tokens.setAccess('expired')           // next request gets 401, refresh succeeds, request retries
  })
  const refreshed = page.waitForRequest((r) => r.url().includes('/api/auth/refresh'))
  await page.getByRole('link', { name: 'Settings' }).click()
  await refreshed
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByLabel('Name')).toHaveValue('Test User')
  await expect(page).toHaveURL(/\/settings$/)
})

test('non-admin gets 403; admin can open /admin', async ({ page }) => {
  await login(page)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
})

test('admin can list users', async ({ page }) => {
  await login(page, ADMIN)
  await page.getByRole('link', { name: /manage users/i }).click()
  await expect(page.getByRole('heading', { name: 'Admin: users' })).toBeVisible()
  await expect(page.getByText('admin@example.test', { exact: false }).first()).toBeVisible()
})

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('logging out in one tab logs out the other', async ({ context }) => {
  const a = await context.newPage()
  await login(a, USER, { remember: true })
  const b = await context.newPage()
  await b.goto('/dashboard')
  await expect(b.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await a.getByRole('button', { name: 'Log out' }).click()
  await expect(a).toHaveURL(/\/login/)
  await expect(b).toHaveURL(/\/login/)
  await expect(b.getByText('You were logged out in another tab.')).toBeVisible()
})

test('logging in on one tab signs in the other', async ({ context }) => {
  const a = await context.newPage()
  const b = await context.newPage()
  await b.goto('/login')
  await login(a, USER, { remember: true })
  await expect(b).toHaveURL(/\/dashboard/)
})

test('idle warning appears and "Stay signed in" keeps the session', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('dev.idleMs', '1500'); localStorage.setItem('dev.warnMs', '20000') })
  await login(page)
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible({ timeout: 8000 })
  await expect(dialog.getByRole('button', { name: 'Stay signed in' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Stay signed in' }).click()
  await expect(dialog).toBeHidden()
})

test('idle timeout logs the user out', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('dev.idleMs', '1000'); localStorage.setItem('dev.warnMs', '3000') })
  await login(page)
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  await expect(page.getByText('You were logged out due to inactivity.')).toBeVisible()
})

test('change password requires the right current password', async ({ page }) => {
  await login(page)
  await page.goto('/settings')
  await page.getByLabel('Current password').fill('not-my-password')
  await page.getByLabel('New password', { exact: true }).fill('Another-Str0ng-Pass!')
  await page.getByLabel('Confirm new password').fill('Another-Str0ng-Pass!')
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Current password is incorrect')).toBeVisible()
})
