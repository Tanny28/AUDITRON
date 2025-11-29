import { getPnl, getBalanceSheet, getGst, getTimeSeries, generateGstReturn } from '@/lib/api/reports'

// Mock fetch globally
global.fetch = jest.fn()

describe('Reports API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Mock localStorage
        Storage.prototype.getItem = jest.fn(() => 'mock-token')
    })

    describe('getPnl', () => {
        it('should fetch P&L report with correct parameters', async () => {
            const mockResponse = {
                period: { from: '2025-01-01', to: '2025-01-31' },
                revenue: { total: 100000, items: [] },
                expenses: { total: 50000, items: [] },
                netProfit: 50000,
                netProfitMargin: 50,
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockResponse,
                })

            const result = await getPnl('2025-01-01', '2025-01-31')

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/reports/pnl'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-token',
                    }),
                })
            )
            expect(result).toEqual(mockResponse)
        })

        it('should handle errors correctly', async () => {
            ; (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: 'Server error' }),
            })

            await expect(getPnl('2025-01-01', '2025-01-31')).rejects.toEqual({
                error: 'Server error',
            })
        })
    })

    describe('getBalanceSheet', () => {
        it('should fetch balance sheet with correct date', async () => {
            const mockResponse = {
                asOf: '2025-01-31',
                assets: { total: 500000, current: { total: 200000, items: [] }, nonCurrent: { total: 300000, items: [] } },
                liabilities: { total: 200000, current: { total: 100000, items: [] }, nonCurrent: { total: 100000, items: [] } },
                equity: { total: 300000, items: [] },
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockResponse,
                })

            const result = await getBalanceSheet('2025-01-31')

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/reports/balance-sheet'),
                expect.any(Object)
            )
            expect(result.asOf).toBe('2025-01-31')
        })
    })

    describe('getGst', () => {
        it('should fetch GST report', async () => {
            const mockResponse = {
                period: '2025-01',
                sales: { total: 100000, taxable: 90000, cgst: 4500, sgst: 4500, igst: 0, items: [] },
                purchases: { total: 50000, taxable: 45000, cgst: 2250, sgst: 2250, igst: 0, items: [] },
                taxCollected: 9000,
                taxPayable: 4500,
                netTax: 4500,
                filedStatus: 'NOT_FILED',
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockResponse,
                })

            const result = await getGst('2025-01-01', '2025-01-31')

            expect(result.period).toBe('2025-01')
            expect(result.netTax).toBe(4500)
        })
    })

    describe('getTimeSeries', () => {
        it('should fetch time series data with metrics', async () => {
            const mockResponse = {
                metric: ['revenue', 'expense'],
                granularity: 'monthly',
                period: { from: '2024-07-01', to: '2025-01-31' },
                data: [
                    { date: '2024-07-01', revenue: 50000, expense: 30000 },
                    { date: '2024-08-01', revenue: 55000, expense: 32000 },
                ],
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockResponse,
                })

            const result = await getTimeSeries(['revenue', 'expense'], '2024-07-01', '2025-01-31', 'monthly')

            expect(result.data).toHaveLength(2)
            expect(result.granularity).toBe('monthly')
        })
    })

    describe('generateGstReturn', () => {
        it('should generate GST return', async () => {
            const mockResponse = {
                url: 'https://example.com/gst-return.pdf',
                message: 'GST return generated successfully',
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockResponse,
                })

            const result = await generateGstReturn('2025-01')

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/reports/gst/generate'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ period: '2025-01' }),
                })
            )
            expect(result.url).toBe('https://example.com/gst-return.pdf')
        })
    })
})
