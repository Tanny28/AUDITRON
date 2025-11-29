import type {
    PnlReport,
    BalanceSheet,
    GstReport,
    TimeSeries,
    ReportSummary,
} from '@/types/reports'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
}

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken()
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({
            error: response.statusText,
            statusCode: response.status,
        }))
        throw error
    }

    return response.json()
}

/**
 * Get P&L report
 */
export async function getPnl(
    from: string,
    to: string
): Promise<PnlReport> {
    const query = new URLSearchParams({ startDate: from, endDate: to })
    return fetchWithAuth<PnlReport>(`${API_BASE}/api/reports/pnl?${query}`)
}

/**
 * Get Balance Sheet
 */
export async function getBalanceSheet(
    date: string
): Promise<BalanceSheet> {
    const query = new URLSearchParams({ date })
    return fetchWithAuth<BalanceSheet>(`${API_BASE}/api/reports/balance-sheet?${query}`)
}

/**
 * Get GST report
 */
export async function getGst(
    from: string,
    to: string
): Promise<GstReport> {
    const query = new URLSearchParams({ startDate: from, endDate: to })
    return fetchWithAuth<GstReport>(`${API_BASE}/api/reports/gst?${query}`)
}

/**
 * Get time series data
 */
export async function getTimeSeries(
    metric: string[],
    from: string,
    to: string,
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
): Promise<TimeSeries> {
    // TODO: Backend may expect different param format
    // Adjust based on actual API implementation
    const query = new URLSearchParams({
        metrics: metric.join(','),
        from,
        to,
        granularity,
    })

    return fetchWithAuth<TimeSeries>(`${API_BASE}/api/reports/time-series?${query}`)
}

/**
 * Get report summary (KPIs)
 */
export async function getReportSummary(
    from: string,
    to: string
): Promise<ReportSummary> {
    // If backend doesn't have /reports/summary, derive from P&L
    try {
        const query = new URLSearchParams({ startDate: from, endDate: to })
        return fetchWithAuth<ReportSummary>(`${API_BASE}/api/reports/summary?${query}`)
    } catch (error) {
        // Fallback: derive from P&L
        const pnl = await getPnl(from, to)
        return {
            totalRevenue: pnl.revenue.total,
            totalExpense: pnl.expenses.total,
            netProfit: pnl.netProfit,
            taxLiabilities: 0, // Would need GST report
            period: { from, to },
        }
    }
}

/**
 * Generate GST return file
 */
export async function generateGstReturn(
    period: string
): Promise<{ url?: string; message: string }> {
    return fetchWithAuth(`${API_BASE}/api/reports/gst/generate`, {
        method: 'POST',
        body: JSON.stringify({ period }),
    })
}

/**
 * Export report to CSV (client-side)
 */
export function exportToCSV(data: any[], filename: string): void {
    if (!data || data.length === 0) {
        throw new Error('No data to export')
    }

    // Get headers from first object
    const headers = Object.keys(data[0])

    // Build CSV content
    const csvContent = [
        headers.join(','),
        ...data.map((row) =>
            headers
                .map((header) => {
                    const value = row[header]
                    // Escape quotes and wrap in quotes if contains comma
                    const stringValue = value?.toString() || ''
                    return stringValue.includes(',') || stringValue.includes('"')
                        ? `"${stringValue.replace(/"/g, '""')}"`
                        : stringValue
                })
                .join(',')
        ),
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
