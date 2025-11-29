// API Types - Generated from Phase 1 Backend Schema

export interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: 'ADMIN' | 'CA' | 'USER'
    organizationId: string
    isActive: boolean
    emailVerified: boolean
    createdAt: string
    updatedAt: string
}

export interface Organization {
    id: string
    name: string
    email: string
    phone?: string
    address?: string
    gstNumber?: string
    panNumber?: string
    subscriptionTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
    subscriptionEndsAt?: string
    createdAt: string
    updatedAt: string
}

export interface AuthResponse {
    token: string
    user: {
        id: string
        email: string
        firstName: string
        lastName: string
        role: 'ADMIN' | 'CA' | 'USER'
        organizationId: string
        organization?: {
            id: string
            name: string
            subscriptionTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
        }
    }
}

export interface RegisterRequest {
    email: string
    password: string
    firstName: string
    lastName: string
    organizationName: string
    organizationEmail: string
}

export interface LoginRequest {
    email: string
    password: string
}

export interface Invoice {
    id: string
    invoiceNumber: string
    vendorName?: string
    vendorGst?: string
    invoiceDate?: string
    dueDate?: string
    totalAmount?: number
    taxAmount?: number
    gstAmount?: number
    status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    fileUrl: string
    fileName: string
    fileSize: number
    mimeType: string
    ocrData?: any
    organizationId: string
    uploadedById: string
    createdAt: string
    updatedAt: string
}

export interface Transaction {
    id: string
    transactionDate: string
    description: string
    amount: number
    type: 'DEBIT' | 'CREDIT'
    category?: string
    subCategory?: string
    gstRate?: number
    gstAmount?: number
    isReconciled: boolean
    bankReference?: string
    notes?: string
    metadata?: any
    organizationId: string
    invoiceId?: string
    createdAt: string
    updatedAt: string
}

export interface AgentJob {
    id: string
    type: 'OCR' | 'CATEGORIZATION' | 'RECONCILIATION' | 'COMPLIANCE' | 'REPORTING'
    status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    input: any
    output?: any
    error?: string
    logs: any[]
    progress: number
    organizationId: string
    triggeredById?: string
    createdAt: string
    updatedAt: string
    startedAt?: string
    completedAt?: string
}

export interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export interface ApiError {
    error: string
    statusCode?: number
    details?: any
}

export interface Report {
    id: string
    name: string
    type: 'PROFIT_LOSS' | 'BALANCE_SHEET' | 'GST' | 'TAX' | 'CASH_FLOW'
    startDate: string
    endDate: string
    data: any
    fileUrl?: string
    organizationId: string
    createdAt: string
    updatedAt: string
}

export interface Reconciliation {
    id: string
    name: string
    startDate: string
    endDate: string
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
    totalMatched: number
    totalUnmatched: number
    matchedAmount: number
    unmatchedAmount: number
    results?: any
    organizationId: string
    createdAt: string
    updatedAt: string
    completedAt?: string
}

// Home page stats
export interface HomeStats {
    updated: number
    status: string
    transactionsProcessed: number
}
