import { test, expect } from '@playwright/test'

test('login page renders for all portal roles', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Welcome back')).toBeVisible()
  await expect(page.locator('#btn-login-submit')).toBeVisible()
})

test('reset password page renders', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByText(/reset password/i).first()).toBeVisible()
})

test('unauthenticated student route redirects to login', async ({ page }) => {
  await page.goto('/student')
  await expect(page).toHaveURL(/\/login/)
})

test('unauthenticated faculty route redirects to login', async ({ page }) => {
  await page.goto('/faculty')
  await expect(page).toHaveURL(/\/login/)
})

test('unauthenticated admin route redirects to login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
})
