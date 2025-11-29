import { test, expect } from '@playwright/test'

/**
 * E2E Test: Organization Management Flow
 * 
 * Run with:
 * npx playwright test tests/e2e/org-flow.spec.ts --headed
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001'
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'admin@auditron.ai'
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'admin123'

test.describe('Organization Management Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${FRONTEND_URL}/auth/login`)
        await page.fill('input[type="email"]', DEMO_USER_EMAIL)
        await page.fill('input[type="password"]', DEMO_USER_PASSWORD)
        await page.click('button[type="submit"]')
        await page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 10000 })
    })

    test('should invite team member', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/organization`)

        // Verify page loaded
        await expect(page.locator('h1:has-text("Organization Management")')).toBeVisible()

        // Fill invite form
        await page.fill('input[type="email"]', 'newmember@example.com')
        await page.selectOption('select', 'ACCOUNTANT')

        // Send invite
        await page.click('button:has-text("Send Invite")')

        // Verify success toast
        await expect(page.locator('text=Invite sent successfully')).toBeVisible({
            timeout: 5000,
        })
    })

    test('should display team members', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/organization`)

        // Wait for members to load
        await page.waitForSelector('text=Team Members', { timeout: 5000 })

        // Verify at least one member is displayed
        const memberCards = page.locator('[class*="glass-bg"]')
        await expect(memberCards.first()).toBeVisible()
    })

    test('should change member role', async ({ page, context }) => {
        await page.goto(`${FRONTEND_URL}/organization`)

        // Wait for members
        await page.waitForSelector('text=Team Members')

        // Find first role dropdown (skip owner)
        const roleSelects = page.locator('select')
        const count = await roleSelects.count()

        if (count > 1) {
            const select = roleSelects.nth(1)
            await select.selectOption('ADMIN')

            // Verify toast (may appear)
            const toast = page.locator('[class*="toast"]').first()
            if (await toast.isVisible({ timeout: 2000 }).catch(() => false)) {
                await expect(toast).toContainText(/Role updated|updated successfully/i)
            }
        }
    })

    test('should remove team member', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/organization`)

        // Wait for members
        await page.waitForSelector('text=Team Members')

        // Find remove button (if any non-owner members exist)
        const removeButtons = page.locator('button:has-text("Remove")')
        const count = await removeButtons.count()

        if (count > 0) {
            // Mock confirmation dialog
            page.on('dialog', (dialog) => dialog.accept())

            // Click remove
            await removeButtons.first().click()

            // Verify toast
            await expect(page.locator('text=Member removed successfully')).toBeVisible({
                timeout: 5000,
            })
        }
    })

    test('should validate invite form', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/organization`)

        // Try to submit empty form
        await page.click('button:has-text("Send Invite")')

        // Form should not submit (HTML5 validation)
        const emailInput = page.locator('input[type="email"]')
        const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
        expect(isInvalid).toBe(true)
    })

    test('should show different roles in dropdown', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/organization`)

        // Check role options in invite form
        const roleSelect = page.locator('select').first()
        const options = await roleSelect.locator('option').allTextContents()

        expect(options).toContain('Viewer')
        expect(options).toContain('Accountant')
        expect(options).toContain('Admin')
        expect(options).toContain('Owner')
    })
})
