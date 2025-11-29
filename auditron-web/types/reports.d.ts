// Report Types for AUDITRON

export interface ReportSummary {
    totalRevenue: number
    totalExpense: number
    netProfit: number
    taxLiabilities: number
    period: {
        from: string
        to: string
    }
}

export interface PnlLineItem {
    category: string
    subCategory?: string
    amount: number
    percentage?: number
    transactions?: number
}

export interface PnlReport {
    period: {
        from: string
        to: string
    }
    revenue: {
        total: number
        items: PnlLineItem[]
    }
    cogs: {
        total: number
        items: PnlLineItem[]
    }
    grossProfit: number
    grossProfitMargin: number
    expenses: {
        total: number
        items: PnlLineItem[]
    }
    netProfit: number
    netProfitMargin: number
    ebitda?: number
}

export interface BalanceSheetAccount {
    name: string
    code?: string
    amount: number
    children?: BalanceSheetAccount[]
}

export interface BalanceSheet {
    asOf: string
    assets: {
        total: number
        current: {
            total: number
            items: BalanceSheetAccount[]
        }
        nonCurrent: {
            total: number
            items: BalanceSheetAccount[]
        }
    }
    liabilities: {
        total: number
        current: {
            total: number
            items: BalanceSheetAccount[]
        }
        nonCurrent: {
            total: number
            items: BalanceSheetAccount[]
        }
    }
    equity: {
        total: number
        items: BalanceSheetAccount[]
    }
}

export interface GstLineItem {
    description: string
    taxableValue: number
    cgst: number
    sgst: number
    igst: number
    total: number
}

export interface GstReport {
    period: string // YYYY-MM
    orgId: string
    gstNumber?: string
    sales: {
        total: number
        taxable: number
        cgst: number
        sgst: number
        igst: number
        items: GstLineItem[]
    }
    purchases: {
        total: number
        taxable: number
        cgst: number
        sgst: number
        igst: number
        items: GstLineItem[]
    }
    taxPayable: number
    taxCollected: number
    netTax: number
    filedStatus: 'NOT_FILED' | 'FILED' | 'LATE'
    filedDate?: string
}

export interface TimeSeriesPoint {
    date: string
    revenue?: number
    expense?: number
    profit?: number
    [key: string]: any
}

export interface TimeSeries {
    metric: string[]
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    period: {
        from: string
        to: string
    }
    data: TimeSeriesPoint[]
}

export interface ReportFilters {
    from: string
    to: string
    orgId?: string
    compare?: boolean
    compareFrom?: string
    compareTo?: string
}

export interface DrilldownData {
    category: string
    transactions: Array<{
        id: string
        date: string
        description: string
        amount: number
        type: 'DEBIT' | 'CREDIT'
    }>
    total: number
    count: number
}
