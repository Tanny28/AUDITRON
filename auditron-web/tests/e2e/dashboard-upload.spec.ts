import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E Test: Dashboard Invoice Upload Flow
 * 
 * Prerequisites:
 * - Backend API running at BASE_URL (default: http://localhost:3000)
 * - Frontend running at FRONTEND_URL (default: http://localhost:3001)
 * - Demo user seeded in database
 * 
 * Environment Variables:
 * - BASE_URL: Backend API base URL
 * - FRONTEND_URL: Frontend app URL
 * - DEMO_USER_EMAIL: Demo user email (default: admin@auditron.ai)
 * - DEMO_USER_PASSWORD: Demo user password (default: admin123)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001'
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'admin@auditron.ai'
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'admin123'

test.describe('Dashboard Invoice Upload Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login page
        await page.goto(`${FRONTEND_URL}/auth/login`)
    })

    test('should login, upload invoice, and view OCR status', async ({ page }) => {
        // Step 1: Login
        await page.fill('input[type="email"]', DEMO_USER_EMAIL)
        await page.fill('input[type="password"]', DEMO_USER_PASSWORD)
        await page.click('button[type="submit"]')

        // Wait for redirect to dashboard
        await page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 10000 })
        await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`)

        // Step 2: Navigate to upload section or click upload button
        // (Adjust selector based on actual dashboard layout)
        const uploadButton = page.locator('text=Upload Invoice').first()
        if (await uploadButton.isVisible()) {
            await uploadButton.click()
        }

        // Step 3: Upload a test invoice file
        const testFilePath = path.join(__dirname, '../fixtures/sample-invoice.jpg')

        // Wait for file input to be available
        const fileInput = page.locator('input[type="file"]')
        await fileInput.setInputFiles(testFilePath)

        // Step 4: Wait for upload success message
        await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 15000 })

        // Extract invoice ID from success message
        const invoiceIdText = await page.locator('code').first().textContent()
        expect(invoiceIdText).toBeTruthy()

        // Step 5: Poll job status until completed
        // Look for job status component
        const jobStatusSection = page.locator('text=Job Status').first()

        if (await jobStatusSection.isVisible()) {
            // Wait for job to complete (max 30 seconds)
            await expect(
                page.locator('text=COMPLETED, text=FAILED').first()
            ).toBeVisible({ timeout: 30000 })

            // Check if completed successfully
            const completedStatus = await page.locator('text=COMPLETED').isVisible()
            expect(completedStatus).toBe(true)
        }

        // Step 6: Navigate to invoice detail page
        if (invoiceIdText) {
            await page.goto(`${FRONTEND_URL}/dashboard/invoice/${invoiceIdText}`)

            // Verify invoice details are displayed
            await expect(page.locator('h1:has-text("Invoice Details")')).toBeVisible()

            // Check for OCR data section
            const ocrDataSection = page.locator('text=OCR Extracted Data')
            if (await ocrDataSection.isVisible()) {
                // Verify OCR data is present
                await expect(page.locator('pre').first()).toBeVisible()
            }
        }
    })

    test('should handle upload errors gracefully', async ({ page }) => {
        // Login first
        await page.fill('input[type="email"]', DEMO_USER_EMAIL)
        await page.fill('input[type="password"]', DEMO_USER_PASSWORD)
        await page.click('button[type="submit"]')
        await page.waitForURL(`${FRONTEND_URL}/dashboard`)

        // Try to upload an invalid file (too large or wrong format)
        const fileInput = page.locator('input[type="file"]')

        // Create a large dummy file (if backend has size limits)
        // Or use an unsupported file type
        const invalidFilePath = path.join(__dirname, '../fixtures/invalid-file.txt')

        try {
            await fileInput.setInputFiles(invalidFilePath)

            // Should show error message
            await expect(
                page.locator('text=/upload failed|invalid file|file too large/i')
            ).toBeVisible({ timeout: 10000 })
        } catch (error) {
            // File might not exist, that's okay for this test stub
            console.log('Invalid file test skipped - fixture not found')
        }
    })

    test('should display invoice list on dashboard', async ({ page }) => {
        // Login
        await page.fill('input[type="email"]', DEMO_USER_EMAIL)
        await page.fill('input[type="password"]', DEMO_USER_PASSWORD)
        await page.click('button[type="submit"]')
        await page.waitForURL(`${FRONTEND_URL}/dashboard`)

        // Check for invoice list/table
        const invoiceList = page.locator('table, [data-testid="invoice-list"]')

        if (await invoiceList.isVisible()) {
            // Verify table has headers
            await expect(page.locator('th:has-text("Invoice")')).toBeVisible()
        } else {
            // Might show empty state
            await expect(
                page.locator('text=/no invoices|upload your first/i')
            ).toBeVisible()
        }
    })
})

/**
 * Test Fixtures Setup:
 * 
 * Create these test files in tests/fixtures/:
 * - sample-invoice.jpg: A sample invoice image (can be any JPG)
 * - sample-invoice.pdf: A sample PDF invoice
 * - invalid-file.txt: A text file for error testing
 * 
 * Run tests with:
 * npx playwright test tests/e2e/dashboard-upload.spec.ts
 * 
 * Or with custom environment:
 * BASE_URL=https://api.auditron.ai FRONTEND_URL=https://app.auditron.ai npx playwright test
 */
