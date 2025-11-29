import type { Reconciliation } from '@/types/api'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
}

/**
 * Start reconciliation job
 */
export async function startReconcile(params: {
    name: string
    startDate: string
    endDate: string
}): Promise<{ message: string; reconciliationId: string; status: string }> {
    const token = getAuthToken()
    const response = await fetch(`${API_BASE}/api/reconcile/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params),
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
 * Get reconciliation status
 */
export async function getReconcileStatus(reconciliationId: string): Promise<{
    id: string
    status: string
    totalMatched: number
    totalUnmatched: number
    matchedAmount: number
    unmatchedAmount: number
    completedAt?: string
}> {
    const token = getAuthToken()
    const response = await fetch(
        `${API_BASE}/api/reconcile/${reconciliationId}/status`,
        {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
    )

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
 * Get reconciliation results
 */
export async function getReconcileResults(
    reconciliationId: string
): Promise<Reconciliation> {
    const token = getAuthToken()
    const response = await fetch(
        `${API_BASE}/api/reconcile/${reconciliationId}/results`,
        {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
    )

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
 * List reconciliations
 */
export async function listReconciliations(): Promise<{ data: Reconciliation[] }> {
    const token = getAuthToken()
    const response = await fetch(`${API_BASE}/api/reconcile/list`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
 * Export reconciliation results to CSV
 */
export function exportReconcileToCSV(reconciliation: Reconciliation): void {
    const matches = reconciliation.matches || []

    // Build CSV content
    const headers = ['Match Type', 'Match Score', 'Transaction ID', 'Ledger Entry ID', 'Created At']
    const rows = matches.map((match: any) => [
        match.matchType || '',
        match.matchScore?.toString() || '',
        match.transactionId || '',
        match.ledgerEntryId || '',
        match.createdAt || '',
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `reconciliation-${reconciliation.id}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
