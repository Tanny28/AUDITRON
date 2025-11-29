import { test, expect } from '@playwright/test'

/**
 * E2E Test: Settings Flow
 * 
 * Prerequisites:
 * - Backend API running at BASE_URL
 * - Frontend running at FRONTEND_URL
 * - Demo user seeded in database
 * 
 * Environment Variables:
 * - BASE_URL: Backend API base URL (default: http://localhost:3000)
 * - FRONTEND_URL: Frontend app URL (default: http://localhost:3001)
 * - DEMO_USER_EMAIL: Demo user email (default: admin@auditron.ai)
 * - DEMO_USER_PASSWORD: Demo user password (default: admin123)
 * 
 * Run with:
 * npx playwright test tests/e2e/settings-flow.spec.ts --headed
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001'
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'admin@auditron.ai'
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'admin123'

test.describe('Settings Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${FRONTEND_URL}/auth/login`)
        await page.fill('input[type="email"]', DEMO_USER_EMAIL)
        await page.fill('input[type="password"]', DEMO_USER_PASSWORD)
        await page.click('button[type="submit"]')
        await page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 10000 })
    })

    test('should update profile settings', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/settings`)

        // Verify settings page loaded
        await expect(page.locator('h1:has-text("Settings")')).toBeVisible()

        // Click profile tab (should be default)
        await page.click('button:has-text("Profile")')

        // Update profile fields
        await page.fill('input[type="text"]', 'John')
        await page.fill('input[type="tel"]', '+91 9876543210')

        // Save changes
        await page.click('button:has-text("Save Changes")')

        // Verify toast notification
        await expect(page.locator('text=Profile updated successfully')).toBeVisible({
            timeout: 5000,
        })
    })

    test('should toggle notification preferences', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/settings`)

        // Click notifications tab
        await page.click('button:has-text("Notifications")')

        // Get initial checkbox state
        const emailAlertsCheckbox = page.locator('input[type="checkbox"]').first()
        const initialState = await emailAlertsCheckbox.isChecked()

        // Toggle checkbox
        await emailAlertsCheckbox.click()

        // Save preferences
        await page.click('button:has-text("Save Preferences")')

        // Verify toast
        await expect(page.locator('text=Notification preferences updated')).toBeVisible({
            timeout: 5000,
        })

        // Verify state changed
        const newState = await emailAlertsCheckbox.isChecked()
        expect(newState).toBe(!initialState)
    })

    test('should change password', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/settings`)

        // Click password tab
        await page.click('button:has-text("Password")')

        // Fill password form
        await page.fill('input[type="password"]', 'currentPassword123')
        await page.locator('input[type="password"]').nth(1).fill('newPassword456')
        await page.locator('input[type="password"]').nth(2).fill('newPassword456')

        // Submit
        await page.click('button[type="submit"]')

        // Verify success or error toast
        const toast = page.locator('[class*="toast"]').first()
        await expect(toast).toBeVisible({ timeout: 5000 })
    })

    test('should show error for mismatched passwords', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/settings`)

        // Click password tab
        await page.click('button:has-text("Password")')

        // Fill with mismatched passwords
        await page.fill('input[type="password"]', 'currentPassword123')
        await page.locator('input[type="password"]').nth(1).fill('newPassword456')
        await page.locator('input[type="password"]').nth(2).fill('differentPassword789')

        // Submit
        await page.click('button[type="submit"]')

        // Verify error toast
        await expect(page.locator('text=Passwords do not match')).toBeVisible({
            timeout: 5000,
        })
    })

    test('should navigate between tabs', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/settings`)

        // Test tab navigation
        await page.click('button:has-text("Profile")')
        await expect(page.locator('label:has-text("First Name")')).toBeVisible()

        await page.click('button:has-text("Notifications")')
        await expect(page.locator('text=Email Alerts')).toBeVisible()

        await page.click('button:has-text("Password")')
        await expect(page.locator('label:has-text("Current Password")')).toBeVisible()
    })
})
