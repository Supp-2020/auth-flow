import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { ADMIN, login } from './helpers'

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([])
}

const publicPages = ['/login', '/signup', '/forgot-password', '/reset-password?token=abc', '/verify-email?email=a%40b.test', '/mock-inbox', '/nope']

for (const path of publicPages) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).waitFor()
    await expectNoViolations(page)
  })
}

test('axe: signed-in pages (dashboard, settings, admin)', async ({ page }) => {
  await login(page, ADMIN)
  await expectNoViolations(page)
  for (const path of ['/settings', '/admin']) {
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).waitFor()
    await expectNoViolations(page)
  }
})

test('axe: 403 page (non-admin on /admin)', async ({ page }) => {
  await login(page)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await expectNoViolations(page)
})

test('axe: signup form with validation errors shown', async ({ page }) => {
  await page.goto('/signup')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Name must be at least 2 characters')).toBeVisible()
  await expectNoViolations(page)
})

test('keyboard: Enter submits the login form and focus lands on the first invalid field', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Password', { exact: true }).press('Enter')
  await expect(page.getByLabel('Email')).toBeFocused()
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-describedby', /.+/)
})
