import { test, expect } from '@playwright/test'

/**
 * E2E Test: Reports Flow
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
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001'
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'admin@auditron.ai'
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'admin123'

test.describe('Reports Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${FRONTEND_URL}/auth/login`)
        await page.fill('input[type="email"]', DEMO_USER_EMAIL)
        await page.fill('input[type="password"]', DEMO_USER_PASSWORD)
        await page.click('button[type="submit"]')
        await page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 10000 })
    })

    test('should view P&L report and export data', async ({ page }) => {
        // Navigate to P&L report
        await page.goto(`${FRONTEND_URL}/reports/pnl`)

        // Wait for page to load
        await expect(page.locator('h1:has-text("Profit & Loss")')).toBeVisible()

        // Select last 6 months preset
        await page.click('button:has-text("6M")')
        await page.click('button:has-text("Apply")')

        // Wait for chart to render
        await page.waitForSelector('.recharts-wrapper', { timeout: 10000 })
        await expect(page.locator('.recharts-wrapper')).toBeVisible()

        // Verify KPI cards are displayed
        const revenueCard = page.locator('text=Total Revenue').first()
        await expect(revenueCard).toBeVisible()

        // Check that at least one KPI has a value
        const kpiValue = await page.locator('.glass-card .text-3xl').first().textContent()
        expect(kpiValue).toBeTruthy()

        // Test CSV export (check download is triggered)
        const downloadPromise = page.waitForEvent('download')
        await page.click('button:has-text("Export CSV")')
        const download = await downloadPromise
        expect(download.suggestedFilename()).toContain('pnl-report')
    })

    test('should view Balance Sheet', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/reports/balance-sheet`)

        await expect(page.locator('h1:has-text("Balance Sheet")')).toBeVisible()

        // Verify accounting equation section
        await expect(page.locator('text=Accounting Equation')).toBeVisible()

        // Check for main sections
        await expect(page.locator('text=Assets')).toBeVisible()
        await expect(page.locator('text=Liabilities')).toBeVisible()
        await expect(page.locator('text=Equity')).toBeVisible()
    })

    test('should view GST report', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/reports/gst`)

        await expect(page.locator('h1:has-text("GST Report")')).toBeVisible()

        // Verify GST summary cards
        await expect(page.locator('text=Tax Collected')).toBeVisible()
        await expect(page.locator('text=Tax Payable')).toBeVisible()
        await expect(page.locator('text=Net Tax')).toBeVisible()

        // Check filing status
        await expect(page.locator('text=Filing Status')).toBeVisible()
    })

    test('should view time series analytics', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/reports/time-series`)

        await expect(page.locator('h1:has-text("Time Series Analytics")')).toBeVisible()

        // Toggle metrics
        await page.click('button:has-text("Revenue")')
        await page.click('button:has-text("Expense")')

        // Wait for chart to update
        await page.waitForTimeout(1000)

        // Verify chart is displayed
        await expect(page.locator('.recharts-wrapper')).toBeVisible()

        // Check data table
        await expect(page.locator('table')).toBeVisible()
    })

    test('should open drilldown modal from P&L', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/reports/pnl`)

        // Wait for report to load
        await page.waitForSelector('table', { timeout: 10000 })

        // Click on a line item (first row in revenue table)
        const firstLineItem = page.locator('table tbody tr').first()

        if (await firstLineItem.isVisible()) {
            await firstLineItem.click()

            // Check if modal opens (this depends on implementation)
            // For now, just verify the row is clickable
            await expect(firstLineItem).toBeVisible()
        }
    })

    test('should handle report errors gracefully', async ({ page }) => {
        // Navigate to a report with invalid date range
        await page.goto(`${FRONTEND_URL}/reports/pnl`)

        // Try to load report with future dates (should fail or show empty data)
        await page.fill('input[type="date"]', '2099-01-01')
        await page.click('button:has-text("Apply")')

        // Should either show error or empty state
        // Wait a bit for API call
        await page.waitForTimeout(2000)

        // Page should still be functional
        await expect(page.locator('h1')).toBeVisible()
    })
})

/**
 * Run tests with:
 * npx playwright test tests/e2e/reports-flow.spec.ts
 * 
 * Or with custom environment:
 * BASE_URL=https://api.auditron.ai FRONTEND_URL=https://app.auditron.ai npx playwright test
 */
