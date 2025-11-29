// Agent Type Definitions

export interface AgentInput {
    jobId: string
    orgId: string
    userId: string
    payload: Record<string, any>
    context?: Record<string, any>
}

export interface AgentOutput {
    success: boolean
    data?: Record<string, any>
    error?: string
    confidenceScore?: number
    flags?: AgentFlag[]
    logs?: string[]
    nextSteps?: string[]
}

export interface AgentFlag {
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
    category: string
    message: string
    field?: string
    suggestedAction?: string
}

export interface OrchestratorPlan {
    workflowType: string
    steps: WorkflowStep[]
    estimatedDuration?: number
    dependencies?: string[]
}

export interface WorkflowStep {
    stepId: string
    agentName: string
    input: Record<string, any>
    retryPolicy?: RetryPolicy
    timeout?: number
    optional?: boolean
}

export interface RetryPolicy {
    maxRetries: number
    backoffMs: number
    backoffMultiplier?: number
}

export interface WorkflowState {
    jobId: string
    workflowType: string
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED'
    currentStep: number
    totalSteps: number
    stepResults: StepResult[]
    startedAt: Date
    completedAt?: Date
    error?: string
}

export interface StepResult {
    stepId: string
    agentName: string
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
    output?: AgentOutput
    startedAt: Date
    completedAt?: Date
    retryCount: number
    error?: string
}

export interface LogEntry {
    timestamp: Date
    jobId: string
    agentName: string
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
    message: string
    metadata?: Record<string, any>
}

export interface ReconciliationMatch {
    matchType: 'EXACT' | 'FUZZY' | 'MANUAL'
    matchScore: number
    transactionId: string
    ledgerEntryId: string
    amount: number
    reasoning?: string
    confidence: number
}

export interface ReconciliationResult {
    reconciliationId: string
    matched: ReconciliationMatch[]
    unmatched: {
        transactions: string[]
        ledgerEntries: string[]
    }
    summary: {
        totalMatched: number
        totalUnmatched: number
        matchedAmount: number
        unmatchedAmount: number
        averageConfidence: number
    }
    flags: AgentFlag[]
}

export interface StructuredInvoice {
    invoiceId: string
    vendorName: string
    vendorGst?: string
    vendorAddress?: string
    invoiceNumber: string
    invoiceDate: Date
    dueDate?: Date
    totalAmount: number
    subtotal?: number
    gstAmount?: number
    cgst?: number
    sgst?: number
    igst?: number
    lineItems?: InvoiceLineItem[]
    currency: string
    confidenceScore: number
    extractedFields: Record<string, any>
}

export interface InvoiceLineItem {
    description: string
    quantity?: number
    unitPrice?: number
    amount: number
    taxRate?: number
    taxAmount?: number
}

export interface GSTCategorization {
    transactionId: string
    category: 'INPUT_TAX' | 'OUTPUT_TAX' | 'EXEMPT' | 'ZERO_RATED'
    gstRate: number
    taxableAmount: number
    cgst: number
    sgst: number
    igst: number
    itcEligible: boolean
    reasoning: string
    confidence: number
}

export interface FinancialSummary {
    period: {
        from: Date
        to: Date
    }
    healthScore: number
    cashFlowTrend: 'IMPROVING' | 'STABLE' | 'DECLINING'
    keyMetrics: {
        revenue: number
        expenses: number
        profit: number
        cashFlow: number
    }
    anomalies: AgentFlag[]
    riskFlags: AgentFlag[]
    recommendations: string[]
    narrative: string
}
