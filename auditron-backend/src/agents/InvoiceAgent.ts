import { BaseAgent } from './base/BaseAgent'
import type { AgentInput, AgentOutput, StructuredInvoice, AgentFlag } from '../types/agent'
import { aiModelService } from '../services/AiModelService'
import { prisma } from '../lib/prisma'

/**
 * InvoiceAgent - Extract and normalize invoice data
 * 
 * Responsibilities:
 * - Refine OCR output using LLM
 * - Extract structured fields (vendor, invoice_no, dates, amounts)
 * - Validate completeness
 * - Detect anomalies
 */
export class InvoiceAgent extends BaseAgent {
    constructor() {
        super({
            name: 'InvoiceAgent',
            description: 'Extracts and normalizes invoice data from OCR output',
            version: '1.0.0',
            timeout: 30000,
        })
    }

    protected async validateInput(input: AgentInput): Promise<{ valid: boolean; error?: string }> {
        if (!input.payload.invoiceId) {
            return { valid: false, error: 'invoiceId is required' }
        }
        return { valid: true }
    }

    protected async executeTask(input: AgentInput): Promise<any> {
        const { invoiceId } = input.payload

        // Fetch invoice from database
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
        })

        if (!invoice) {
            throw new Error(`Invoice ${invoiceId} not found`)
        }

        // Get OCR data (if available)
        const ocrData = invoice.ocrData as Record<string, any> | null

        if (!ocrData) {
            throw new Error('No OCR data available for invoice')
        }

        // Use LLM to refine and structure the data
        const structuredData = await this.refineWithLLM(ocrData, invoice.fileName)

        // Validate completeness
        const anomalies = this.detectAnomalies(structuredData)

        return {
            structuredData,
            anomalies,
            invoice,
        }
    }

    protected async produceOutput(result: any, input: AgentInput): Promise<AgentOutput> {
        const { structuredData, anomalies, invoice } = result

        // Update invoice in database with normalized data
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                vendorName: structuredData.vendorName,
                vendorGst: structuredData.vendorGst,
                invoiceNumber: structuredData.invoiceNumber,
                invoiceDate: structuredData.invoiceDate,
                dueDate: structuredData.dueDate,
                totalAmount: structuredData.totalAmount,
                gstAmount: structuredData.gstAmount,
                status: anomalies.length > 0 ? 'NEEDS_REVIEW' : 'COMPLETED',
            },
        })

        return {
            success: true,
            data: {
                structuredInvoice: structuredData,
                anomalies,
            },
            confidenceScore: structuredData.confidenceScore,
            flags: anomalies,
            nextSteps: anomalies.length > 0 ? ['MANUAL_REVIEW'] : ['VALIDATION'],
        }
    }

    /**
     * Refine OCR data using LLM
     */
    private async refineWithLLM(
        ocrData: Record<string, any>,
        fileName: string
    ): Promise<StructuredInvoice> {
        const prompt = `
You are an expert accountant analyzing an invoice. Extract and normalize the following fields from the OCR data.

OCR Data:
${JSON.stringify(ocrData, null, 2)}

Extract these fields with high accuracy:
- vendorName (company name)
- vendorGst (GST number if present, format: 22AAAAA0000A1Z5)
- invoiceNumber
- invoiceDate (ISO format YYYY-MM-DD)
- dueDate (ISO format YYYY-MM-DD, if present)
- totalAmount (numeric)
- subtotal (numeric, if present)
- gstAmount (total GST, numeric)
- cgst, sgst, igst (individual tax components if present)
- lineItems (array of {description, quantity, unitPrice, amount, taxRate})

Return a JSON object matching this structure. Use null for missing fields.
Provide a confidenceScore (0-1) based on data quality.
`

        const schema = {
            vendorName: 'string',
            vendorGst: 'string | null',
            invoiceNumber: 'string',
            invoiceDate: 'string (ISO)',
            dueDate: 'string | null',
            totalAmount: 'number',
            subtotal: 'number | null',
            gstAmount: 'number | null',
            cgst: 'number | null',
            sgst: 'number | null',
            igst: 'number | null',
            lineItems: 'array',
            confidenceScore: 'number',
        }

        const structured = await aiModelService.structuredOutput<any>(prompt, schema)

        return {
            invoiceId: '',
            ...structured,
            invoiceDate: new Date(structured.invoiceDate),
            dueDate: structured.dueDate ? new Date(structured.dueDate) : undefined,
            currency: 'INR',
            extractedFields: ocrData,
        }
    }

    /**
     * Detect anomalies in extracted data
     */
    private detectAnomalies(data: StructuredInvoice): AgentFlag[] {
        const flags: AgentFlag[] = []

        // Missing vendor name
        if (!data.vendorName || data.vendorName.length < 2) {
            flags.push({
                severity: 'ERROR',
                category: 'MISSING_FIELD',
                message: 'Vendor name is missing or invalid',
                field: 'vendorName',
                suggestedAction: 'Manual entry required',
            })
        }

        // Missing invoice number
        if (!data.invoiceNumber) {
            flags.push({
                severity: 'ERROR',
                category: 'MISSING_FIELD',
                message: 'Invoice number is missing',
                field: 'invoiceNumber',
                suggestedAction: 'Manual entry required',
            })
        }

        // Invalid GST format
        if (data.vendorGst && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d{1}[A-Z]{1}\d{1}$/.test(data.vendorGst)) {
            flags.push({
                severity: 'WARNING',
                category: 'INVALID_FORMAT',
                message: 'GST number format is invalid',
                field: 'vendorGst',
                suggestedAction: 'Verify GST number',
            })
        }

        // Future invoice date
        if (data.invoiceDate > new Date()) {
            flags.push({
                severity: 'WARNING',
                category: 'DATE_ANOMALY',
                message: 'Invoice date is in the future',
                field: 'invoiceDate',
                suggestedAction: 'Verify invoice date',
            })
        }

        // Low confidence
        if (data.confidenceScore < 0.7) {
            flags.push({
                severity: 'WARNING',
                category: 'LOW_CONFIDENCE',
                message: `Low extraction confidence: ${(data.confidenceScore * 100).toFixed(0)}%`,
                suggestedAction: 'Manual review recommended',
            })
        }

        return flags
    }
}
