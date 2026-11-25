import { expect, type Page } from '@playwright/test'

// Mock-only demo credentials (see src/mocks/db.ts). Not real accounts.
export const USER = { email: 'user@example.test', password: 'Password-1234!' }
export const ADMIN = { email: 'admin@example.test', password: 'Password-1234!' }

export async function login(page: Page, creds = USER, opts: { remember?: boolean } = {}) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(creds.email)
  await page.getByLabel('Password', { exact: true }).fill(creds.password)
  if (opts.remember) await page.getByLabel('Remember me').check()
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}
