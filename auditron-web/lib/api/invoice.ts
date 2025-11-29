import type { Invoice, PaginatedResponse } from '@/types/api'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'

/**
 * Get auth token from localStorage
 * TODO: In production, use HttpOnly cookies instead
 */
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
}

/**
 * Retry wrapper for transient failures
 */
async function retryFetch<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error: any) {
            lastError = error

            // Don't retry on client errors (4xx)
            if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
                throw error
            }

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)))
            }
        }
    }

    throw lastError || new Error('Max retries exceeded')
}

/**
 * Upload invoice file with progress tracking
 */
export async function uploadInvoice(
    file: File,
    onProgress?: (progress: number) => void
): Promise<{ invoiceId: string; jobId?: string }> {
    return new Promise((resolve, reject) => {
        const formData = new FormData()
        formData.append('file', file)

        const xhr = new XMLHttpRequest()

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const progress = Math.round((e.loaded / e.total) * 100)
                onProgress(progress)
            }
        })

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText)
                    resolve(response)
                } catch (error) {
                    reject(new Error('Invalid response format'))
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText)
                    reject(error)
                } catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`))
                }
            }
        })

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'))
        })

        xhr.open('POST', `${API_BASE}/api/invoice/upload`)

        const token = getAuthToken()
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }

        xhr.send(formData)
    })
}

/**
 * List invoices with pagination
 */
export async function listInvoices(params?: {
    page?: number
    limit?: number
    status?: string
}): Promise<PaginatedResponse<Invoice>> {
    return retryFetch(async () => {
        const query = new URLSearchParams()
        if (params?.page) query.set('page', params.page.toString())
        if (params?.limit) query.set('limit', params.limit.toString())
        if (params?.status) query.set('status', params.status)

        const token = getAuthToken()
        const response = await fetch(
            `${API_BASE}/api/invoice/list?${query.toString()}`,
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
    })
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
    return retryFetch(async () => {
        const token = getAuthToken()
        const response = await fetch(`${API_BASE}/api/invoice/${invoiceId}`, {
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
    })
}

/**
 * Start OCR processing for invoice
 */
export async function startInvoiceOcr(
    invoiceId: string
): Promise<{ message: string; invoiceId: string; status: string; jobId?: string }> {
    return retryFetch(async () => {
        const token = getAuthToken()
        const response = await fetch(`${API_BASE}/api/invoice/${invoiceId}/ocr`, {
            method: 'POST',
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
    })
}

/**
 * Delete invoice
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
    const token = getAuthToken()
    const response = await fetch(`${API_BASE}/api/invoice/${invoiceId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({
            error: response.statusText,
            statusCode: response.status,
        }))
        throw error
    }
}
