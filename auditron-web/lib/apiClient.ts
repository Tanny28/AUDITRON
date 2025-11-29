import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User,
    Invoice,
    Transaction,
    AgentJob,
    PaginatedResponse,
    ApiError,
    HomeStats,
} from '@/types/api'

// Get API base URL from environment or fallback to localhost
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'

/**
 * API Client for AUDITRON Backend
 * 
 * SECURITY NOTE:
 * - Currently uses localStorage for token storage (development only)
 * - For production, switch to HttpOnly cookies via backend Set-Cookie
 * - See README-frontend.md for cookie-based auth implementation
 */

class ApiClient {
    private baseUrl: string
    private token: string | null = null

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
        // Initialize token from localStorage (client-side only)
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token')
        }
    }

    /**
     * Set authentication token
     * TODO: In production, use HttpOnly cookies instead
     */
    setToken(token: string) {
        this.token = token
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token)
        }
    }

    /**
     * Clear authentication token
     */
    clearToken() {
        this.token = null
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
        }
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser(): User | null {
        if (typeof window === 'undefined') return null
        const userStr = localStorage.getItem('user')
        return userStr ? JSON.parse(userStr) : null
    }

    /**
     * Save user to localStorage
     */
    private saveUser(user: User) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user))
        }
    }

    /**
     * Generic fetch wrapper with auth headers
     */
    private async fetch<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        }

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        })

        if (!response.ok) {
            const error: ApiError = await response.json().catch(() => ({
                error: response.statusText,
                statusCode: response.status,
            }))
            throw error
        }

        return response.json()
    }

    // ============================================
    // AUTH ENDPOINTS
    // ============================================

    /**
     * Register new user and organization
     */
    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await this.fetch<AuthResponse>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        })

        this.setToken(response.token)
        this.saveUser(response.user as User)
        return response
    }

    /**
     * Login user
     */
    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await this.fetch<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        })

        this.setToken(response.token)
        this.saveUser(response.user as User)
        return response
    }

    /**
     * Get current authenticated user
     */
    async me(): Promise<User> {
        return this.fetch<User>('/api/auth/me')
    }

    /**
     * Logout user
     */
    logout() {
        this.clearToken()
    }

    // ============================================
    // INVOICE ENDPOINTS
    // ============================================

    /**
     * Upload invoice file
     */
    async uploadInvoice(file: File): Promise<Invoice> {
        const formData = new FormData()
        formData.append('file', file)

        const headers: HeadersInit = {}
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`
        }

        const response = await fetch(`${this.baseUrl}/api/invoice/upload`, {
            method: 'POST',
            headers,
            body: formData,
        })

        if (!response.ok) {
            const error: ApiError = await response.json().catch(() => ({
                error: response.statusText,
                statusCode: response.status,
            }))
            throw error
        }

        return response.json()
    }

    /**
     * List invoices with pagination
     */
    async listInvoices(params?: {
        page?: number
        limit?: number
        status?: string
    }): Promise<PaginatedResponse<Invoice>> {
        const query = new URLSearchParams()
        if (params?.page) query.set('page', params.page.toString())
        if (params?.limit) query.set('limit', params.limit.toString())
        if (params?.status) query.set('status', params.status)

        return this.fetch<PaginatedResponse<Invoice>>(
            `/api/invoice/list?${query.toString()}`
        )
    }

    /**
     * Get invoice by ID
     */
    async getInvoice(id: string): Promise<Invoice> {
        return this.fetch<Invoice>(`/api/invoice/${id}`)
    }

    /**
     * Start OCR processing for invoice
     */
    async startOCR(invoiceId: string): Promise<{ message: string; invoiceId: string; status: string }> {
        return this.fetch(`/api/invoice/${invoiceId}/ocr`, {
            method: 'POST',
        })
    }

    // ============================================
    // TRANSACTION ENDPOINTS
    // ============================================

    /**
     * List transactions
     */
    async listTransactions(params?: {
        page?: number
        limit?: number
        category?: string
        isReconciled?: boolean
    }): Promise<PaginatedResponse<Transaction>> {
        const query = new URLSearchParams()
        if (params?.page) query.set('page', params.page.toString())
        if (params?.limit) query.set('limit', params.limit.toString())
        if (params?.category) query.set('category', params.category)
        if (params?.isReconciled !== undefined) {
            query.set('isReconciled', params.isReconciled.toString())
        }

        return this.fetch<PaginatedResponse<Transaction>>(
            `/api/transactions?${query.toString()}`
        )
    }

    // ============================================
    // AGENT ENDPOINTS
    // ============================================

    /**
     * Get agent job status
     */
    async getAgentJobStatus(jobId: string): Promise<AgentJob> {
        return this.fetch<AgentJob>(`/api/agent/status/${jobId}`)
    }

    /**
     * List agent jobs
     */
    async listAgentJobs(): Promise<{ data: AgentJob[] }> {
        return this.fetch('/api/agent/list')
    }

    // ============================================
    // BILLING ENDPOINTS
    // ============================================

    /**
     * Create Stripe checkout session
     */
    async createCheckoutSession(priceId: string): Promise<{ url: string }> {
        return this.fetch('/api/billing/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ priceId }),
        })
    }

    // ============================================
    // STATS & MISC
    // ============================================

    /**
     * Get home page stats (stub for demo)
     */
    async getHomeStats(): Promise<HomeStats> {
        // This is a stub - in production, create a dedicated endpoint
        return {
            updated: 17,
            status: '93%',
            transactionsProcessed: 8000,
        }
    }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE)

// Export class for testing
export { ApiClient }
