import { BaseAgent } from './base/BaseAgent'
import type { AgentInput, AgentOutput, FinancialSummary } from '../types/agent'
import { aiModelService } from '../services/AiModelService'

/**
 * SummaryAgent - Generate human-readable summaries
 * 
 * Responsibilities:
 * - Create concise summaries for accountants
 * - Highlight key findings
 * - Provide actionable recommendations
 */
export class SummaryAgent extends BaseAgent {
    constructor() {
        super({
            name: 'SummaryAgent',
            description: 'Generates human-readable financial summaries',
            version: '1.0.0',
            timeout: 15000,
        })
    }

    protected async validateInput(input: AgentInput): Promise<{ valid: boolean; error?: string }> {
        if (!input.payload.data) {
            return { valid: false, error: 'data is required' }
        }
        return { valid: true }
    }

    protected async executeTask(input: AgentInput): Promise<any> {
        const { data, summaryType } = input.payload

        let summary: string
        let highlights: string[] = []

        switch (summaryType) {
            case 'invoice':
                summary = await this.summarizeInvoice(data)
                highlights = this.extractInvoiceHighlights(data)
                break

            case 'reconciliation':
                summary = await this.summarizeReconciliation(data)
                highlights = this.extractReconciliationHighlights(data)
                break

            case 'gst':
                summary = await this.summarizeGST(data)
                highlights = this.extractGSTHighlights(data)
                break

            case 'financial':
                summary = await this.summarizeFinancialHealth(data)
                highlights = this.extractFinancialHighlights(data)
                break

            default:
                summary = await this.generateGenericSummary(data)
                highlights = []
        }

        return {
            summaryText: summary,
            highlights,
            summaryType,
        }
    }

    protected async produceOutput(result: any, input: AgentInput): Promise<AgentOutput> {
        return {
            success: true,
            data: {
                summary: result.summaryText,
                highlights: result.highlights,
                type: result.summaryType,
            },
            nextSteps: [],
        }
    }

    /**
     * Summarize invoice processing
     */
    private async summarizeInvoice(data: any): Promise<string> {
        const prompt = `
Create a concise summary for an accountant about this invoice processing result:

${JSON.stringify(data, null, 2)}

Include:
- Vendor and invoice details
- Key amounts (total, GST)
- Any validation issues or flags
- Recommended actions

Keep it professional and under 150 words.
`

        return await aiModelService.chatCompletion(
            [
                {
                    role: 'system',
                    content: 'You are a financial auditor creating concise summaries for accountants.',
                },
                { role: 'user', content: prompt },
            ],
            { temperature: 0.3, maxTokens: 300 }
        )
    }

    /**
     * Summarize reconciliation
     */
    private async summarizeReconciliation(data: any): Promise<string> {
        const prompt = `
Create a summary of this bank reconciliation:

${JSON.stringify(data, null, 2)}

Include:
- Total matched vs unmatched items
- Matched amount and percentage
- Key discrepancies
- Recommended follow-up actions

Keep it concise and actionable.
`

        return await aiModelService.chatCompletion(
            [
                {
                    role: 'system',
                    content: 'You are a financial auditor summarizing reconciliation results.',
                },
                { role: 'user', content: prompt },
            ],
            { temperature: 0.3, maxTokens: 300 }
        )
    }

    /**
     * Summarize GST assessment
     */
    private async summarizeGST(data: any): Promise<string> {
        const prompt = `
Summarize this GST assessment:

${JSON.stringify(data, null, 2)}

Include:
- GST category and rate
- Tax amounts (CGST, SGST, IGST)
- ITC eligibility
- Any compliance issues

Professional tone, under 100 words.
`

        return await aiModelService.chatCompletion(
            [
                {
                    role: 'system',
                    content: 'You are a GST compliance expert.',
                },
                { role: 'user', content: prompt },
            ],
            { temperature: 0.3, maxTokens: 200 }
        )
    }

    /**
     * Summarize financial health
     */
    private async summarizeFinancialHealth(data: any): Promise<string> {
        const prompt = `
Create an executive summary of financial health:

${JSON.stringify(data, null, 2)}

Include:
- Overall health score interpretation
- Cash flow trend
- Key metrics (revenue, expenses, profit)
- Top risks and recommendations

Executive-level summary, 200 words max.
`

        return await aiModelService.chatCompletion(
            [
                {
                    role: 'system',
                    content: 'You are a CFO providing financial insights.',
                },
                { role: 'user', content: prompt },
            ],
            { temperature: 0.4, maxTokens: 400 }
        )
    }

    /**
     * Generic summary
     */
    private async generateGenericSummary(data: any): Promise<string> {
        const prompt = `Summarize this financial data concisely:\n\n${JSON.stringify(data, null, 2)}`

        return await aiModelService.chatCompletion(
            [
                { role: 'system', content: 'You are a helpful financial assistant.' },
                { role: 'user', content: prompt },
            ],
            { temperature: 0.5, maxTokens: 250 }
        )
    }

    /**
     * Extract invoice highlights
     */
    private extractInvoiceHighlights(data: any): string[] {
        const highlights: string[] = []

        if (data.totalAmount) {
            highlights.push(`Total Amount: ₹${data.totalAmount.toLocaleString()}`)
        }

        if (data.flags && data.flags.length > 0) {
            highlights.push(`${data.flags.length} validation issue(s) found`)
        }

        if (data.confidenceScore && data.confidenceScore < 0.8) {
            highlights.push(`Low confidence: ${(data.confidenceScore * 100).toFixed(0)}%`)
        }

        return highlights
    }

    /**
     * Extract reconciliation highlights
     */
    private extractReconciliationHighlights(data: any): string[] {
        const highlights: string[] = []

        if (data.summary) {
            highlights.push(`${data.summary.totalMatched} items matched`)
            highlights.push(`${data.summary.totalUnmatched} items unmatched`)
            highlights.push(`₹${data.summary.matchedAmount.toLocaleString()} reconciled`)
        }

        return highlights
    }

    /**
     * Extract GST highlights
     */
    private extractGSTHighlights(data: any): string[] {
        const highlights: string[] = []

        if (data.gstRate) {
            highlights.push(`GST Rate: ${data.gstRate}%`)
        }

        if (data.itcEligible) {
            highlights.push('ITC Eligible')
        }

        if (data.flags && data.flags.length > 0) {
            highlights.push(`${data.flags.length} GST issue(s)`)
        }

        return highlights
    }

    /**
     * Extract financial highlights
     */
    private extractFinancialHighlights(data: any): string[] {
        const highlights: string[] = []

        if (data.healthScore) {
            highlights.push(`Health Score: ${data.healthScore}/100`)
        }

        if (data.cashFlowTrend) {
            highlights.push(`Cash Flow: ${data.cashFlowTrend}`)
        }

        if (data.riskFlags && data.riskFlags.length > 0) {
            highlights.push(`${data.riskFlags.length} risk(s) identified`)
        }

        return highlights
    }
}
