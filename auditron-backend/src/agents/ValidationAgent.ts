import { BaseAgent } from './base/BaseAgent'
import type { AgentInput, AgentOutput, AgentFlag, StructuredInvoice } from '../types/agent'
import { aiModelService } from '../services/AiModelService'
import { prisma } from '../lib/prisma'

/**
 * ValidationAgent - Validate invoice data
 * 
 * Responsibilities:
 * - Rule-based validation (dates, amounts, formats)
 * - LLM-based validation (reasonableness checks)
 * - Duplicate detection
 * - Tax calculation verification
 */
export class ValidationAgent extends BaseAgent {
    constructor() {
        super({
            name: 'ValidationAgent',
            description: 'Validates invoice data for accuracy and completeness',
            version: '1.0.0',
            timeout: 20000,
        })
    }

    protected async validateInput(input: AgentInput): Promise<{ valid: boolean; error?: string }> {
        if (!input.payload.invoiceData && !input.payload.invoiceId) {
            return { valid: false, error: 'invoiceData or invoiceId is required' }
        }
        return { valid: true }
    }

    protected async executeTask(input: AgentInput): Promise<any> {
        let invoiceData: any

        if (input.payload.invoiceId) {
            const invoice = await prisma.invoice.findUnique({
                where: { id: input.payload.invoiceId },
            })
            if (!invoice) throw new Error('Invoice not found')
            invoiceData = invoice
        } else {
            invoiceData = input.payload.invoiceData
        }

        // Run validation checks
        const flags: AgentFlag[] = []

        // Rule-based validations
        flags.push(...this.validateDates(invoiceData))
        flags.push(...this.validateAmounts(invoiceData))
        flags.push(...this.validateTaxCalculations(invoiceData))

        // Duplicate detection
        const duplicateFlag = await this.checkDuplicates(invoiceData, input.orgId)
        if (duplicateFlag) flags.push(duplicateFlag)

        // LLM-based reasonableness check
        const llmFlags = await this.llmReasonablenessCheck(invoiceData)
        flags.push(...llmFlags)

        return {
            invoiceData,
            flags,
            isValid: flags.filter((f) => f.severity === 'ERROR').length === 0,
        }
    }

    protected async produceOutput(result: any, input: AgentInput): Promise<AgentOutput> {
        return {
            success: true,
            data: {
                validatedData: result.invoiceData,
                isValid: result.isValid,
            },
            flags: result.flags,
            nextSteps: result.isValid ? ['CATEGORIZATION'] : ['MANUAL_REVIEW'],
        }
    }

    /**
     * Validate dates
     */
    private validateDates(invoice: any): AgentFlag[] {
        const flags: AgentFlag[] = []

        // Invoice date in future
        if (invoice.invoiceDate && new Date(invoice.invoiceDate) > new Date()) {
            flags.push({
                severity: 'ERROR',
                category: 'DATE_INVALID',
                message: 'Invoice date cannot be in the future',
                field: 'invoiceDate',
                suggestedAction: 'Correct invoice date',
            })
        }

        // Due date before invoice date
        if (
            invoice.dueDate &&
            invoice.invoiceDate &&
            new Date(invoice.dueDate) < new Date(invoice.invoiceDate)
        ) {
            flags.push({
                severity: 'ERROR',
                category: 'DATE_INVALID',
                message: 'Due date cannot be before invoice date',
                field: 'dueDate',
                suggestedAction: 'Correct due date',
            })
        }

        // Invoice older than 7 years (tax retention period)
        const sevenYearsAgo = new Date()
        sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7)
        if (invoice.invoiceDate && new Date(invoice.invoiceDate) < sevenYearsAgo) {
            flags.push({
                severity: 'WARNING',
                category: 'DATE_OLD',
                message: 'Invoice is older than 7 years',
                field: 'invoiceDate',
                suggestedAction: 'Verify if still relevant',
            })
        }

        return flags
    }

    /**
     * Validate amounts
     */
    private validateAmounts(invoice: any): AgentFlag[] {
        const flags: AgentFlag[] = []

        // Negative amounts
        if (invoice.totalAmount && invoice.totalAmount < 0) {
            flags.push({
                severity: 'ERROR',
                category: 'AMOUNT_INVALID',
                message: 'Total amount cannot be negative',
                field: 'totalAmount',
                suggestedAction: 'Verify amount',
            })
        }

        // Unusually large amount (> 10 crore)
        if (invoice.totalAmount && invoice.totalAmount > 100000000) {
            flags.push({
                severity: 'WARNING',
                category: 'AMOUNT_UNUSUAL',
                message: 'Unusually large invoice amount',
                field: 'totalAmount',
                suggestedAction: 'Verify amount is correct',
            })
        }

        // Subtotal + GST != Total (with tolerance)
        if (invoice.subtotal && invoice.gstAmount && invoice.totalAmount) {
            const calculated = invoice.subtotal + invoice.gstAmount
            const diff = Math.abs(calculated - invoice.totalAmount)
            if (diff > 1) {
                // Allow ₹1 tolerance for rounding
                flags.push({
                    severity: 'ERROR',
                    category: 'AMOUNT_MISMATCH',
                    message: `Total mismatch: Subtotal (${invoice.subtotal}) + GST (${invoice.gstAmount}) != Total (${invoice.totalAmount})`,
                    field: 'totalAmount',
                    suggestedAction: 'Recalculate totals',
                })
            }
        }

        return flags
    }

    /**
     * Validate tax calculations
     */
    private validateTaxCalculations(invoice: any): AgentFlag[] {
        const flags: AgentFlag[] = []

        // CGST + SGST + IGST should equal gstAmount
        if (invoice.gstAmount) {
            const cgst = invoice.cgst || 0
            const sgst = invoice.sgst || 0
            const igst = invoice.igst || 0
            const calculated = cgst + sgst + igst

            if (Math.abs(calculated - invoice.gstAmount) > 1) {
                flags.push({
                    severity: 'ERROR',
                    category: 'TAX_MISMATCH',
                    message: `GST components (${calculated}) don't match total GST (${invoice.gstAmount})`,
                    field: 'gstAmount',
                    suggestedAction: 'Verify tax breakdown',
                })
            }
        }

        // CGST and SGST should be equal (for intra-state)
        if (invoice.cgst && invoice.sgst && invoice.cgst !== invoice.sgst) {
            flags.push({
                severity: 'WARNING',
                category: 'TAX_UNUSUAL',
                message: 'CGST and SGST amounts are not equal',
                suggestedAction: 'Verify tax split',
            })
        }

        // Cannot have both IGST and CGST/SGST
        if (invoice.igst && invoice.igst > 0 && (invoice.cgst || invoice.sgst)) {
            flags.push({
                severity: 'ERROR',
                category: 'TAX_INVALID',
                message: 'Cannot have both IGST and CGST/SGST',
                suggestedAction: 'Correct tax type',
            })
        }

        return flags
    }

    /**
     * Check for duplicate invoices
     */
    private async checkDuplicates(invoice: any, orgId: string): Promise<AgentFlag | null> {
        if (!invoice.invoiceNumber || !invoice.vendorName) return null

        const existing = await prisma.invoice.findFirst({
            where: {
                orgId,
                invoiceNumber: invoice.invoiceNumber,
                vendorName: invoice.vendorName,
                id: { not: invoice.id },
            },
        })

        if (existing) {
            return {
                severity: 'CRITICAL',
                category: 'DUPLICATE',
                message: `Duplicate invoice found: ${existing.invoiceNumber} from ${invoice.vendorName}`,
                suggestedAction: 'Verify if this is a duplicate or reissue',
            }
        }

        return null
    }

    /**
     * LLM-based reasonableness check
     */
    private async llmReasonablenessCheck(invoice: any): Promise<AgentFlag[]> {
        try {
            const prompt = `
Analyze this invoice for reasonableness and potential issues:

Vendor: ${invoice.vendorName}
Invoice Number: ${invoice.invoiceNumber}
Date: ${invoice.invoiceDate}
Amount: ₹${invoice.totalAmount}
GST: ₹${invoice.gstAmount || 0}

Identify any red flags or unusual patterns. Consider:
- Is the amount reasonable for this type of vendor?
- Are there any suspicious patterns?
- Does the GST rate seem correct?

Return JSON: { "flags": [{ "severity": "WARNING|ERROR", "message": "...", "category": "..." }] }
If no issues, return empty flags array.
`

            const result = await aiModelService.structuredOutput<{ flags: any[] }>(
                prompt,
                { flags: 'array' },
                'You are an expert fraud detection analyst for accounting.'
            )

            return result.flags.map((f) => ({
                severity: f.severity,
                category: f.category || 'LLM_CHECK',
                message: f.message,
                suggestedAction: 'Review flagged item',
            }))
        } catch (error) {
            this.logger.warn('LLM reasonableness check failed', { error })
            return []
        }
    }
}
