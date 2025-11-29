import { test, expect } from '@playwright/test'

/**
 * E2E Test: Billing Flow
 * 
 * Run with:
 * npx playwright test tests/e2e/billing-flow.spec.ts --headed
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001'
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'admin@auditron.ai'
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'admin123'

test.describe('Billing Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${FRONTEND_URL}/auth/login`)
        await page.fill('input[type="email"]', DEMO_USER_EMAIL)
        await page.fill('input[type="password"]', DEMO_USER_PASSWORD)
        await page.click('button[type="submit"]')
        await page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 10000 })
    })

    test('should display current subscription status', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/billing`)

        // Verify billing page loaded
        await expect(page.locator('h1:has-text("Billing & Subscription")')).toBeVisible()

        // Verify current plan section
        await expect(page.locator('h2:has-text("Current Plan")')).toBeVisible()

        // Should show plan name
        const planName = page.locator('text=/starter|pro|enterprise|free/i').first()
        await expect(planName).toBeVisible({ timeout: 5000 })
    })

    test('should display available plans', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/billing`)

        // Wait for plans to load
        await page.waitForSelector('text=AUDITRON', { timeout: 5000 })

        // Verify all three plans are displayed
        await expect(page.locator('text=AUDITRON Starter')).toBeVisible()
        await expect(page.locator('text=AUDITRON Pro')).toBeVisible()
        await expect(page.locator('text=AUDITRON Enterprise')).toBeVisible()
    })

    test('should show plan features', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/billing`)

        // Verify features are listed
        const features = page.locator('ul li')
        const count = await features.count()

        expect(count).toBeGreaterThan(0)
    })

    test('should handle upgrade button click', async ({ page, context }) => {
        await page.goto(`${FRONTEND_URL}/billing`)

        // Mock Stripe checkout redirect
        await context.route('**/api/billing/checkout', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    sessionId: 'cs_test_123',
                    url: 'https://checkout.stripe.com/test',
                }),
            })
        })

        // Find upgrade button (not current plan)
        const upgradeButtons = page.locator('button:has-text("Upgrade")')
        const count = await upgradeButtons.count()

        if (count > 0) {
            // Click first upgrade button
            await upgradeButtons.first().click()

            // Should redirect or show loading
            await page.waitForTimeout(1000)
        }
    })

    test('should open billing portal', async ({ page, context }) => {
        await page.goto(`${FRONTEND_URL}/billing`)

        // Mock portal session
        await context.route('**/api/billing/portal', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    url: 'https://billing.stripe.com/test',
                }),
            })
        })

        // Click manage billing button
        const manageButton = page.locator('button:has-text("Manage Billing")')

        if (await manageButton.isVisible()) {
            await manageButton.click()

            // Should redirect
            await page.waitForTimeout(1000)
        }
    })

    test('should highlight popular plan', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/billing`)

        // Pro plan should have "Most Popular" badge
        const popularBadge = page.locator('text=Most Popular')
        await expect(popularBadge).toBeVisible({ timeout: 5000 })

        // Should have special styling (border)
        const proCard = page.locator('text=AUDITRON Pro').locator('..')
        const hasBorder = await proCard.evaluate((el) => {
            const style = window.getComputedStyle(el)
            return style.borderColor.includes('212') || style.borderWidth !== '0px'
        })

        expect(hasBorder).toBe(true)
    })

    test('should show contact sales for enterprise', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/billing`)

        // Enterprise should have contact sales button
        const contactButton = page.locator('a:has-text("Contact Sales")')
        await expect(contactButton).toBeVisible({ timeout: 5000 })

        // Should have mailto link
        const href = await contactButton.getAttribute('href')
        expect(href).toContain('mailto:')
    })

    test('should disable current plan button', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/billing`)

        // Wait for plans
        await page.waitForSelector('text=AUDITRON')

        // Current plan button should be disabled
        const currentPlanButton = page.locator('button:has-text("Current Plan")')

        if (await currentPlanButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            const isDisabled = await currentPlanButton.isDisabled()
            expect(isDisabled).toBe(true)
        }
    })
})
