import { BaseAgent } from './base/BaseAgent'
import type { AgentInput, AgentOutput, GSTCategorization, AgentFlag } from '../types/agent'
import { aiModelService } from '../services/AiModelService'

/**
 * GSTAgent - GST classification and validation
 * 
 * Responsibilities:
 * - Classify transactions (INPUT_TAX, OUTPUT_TAX, EXEMPT, ZERO_RATED)
 * - Validate GST rates
 * - Calculate ITC eligibility
 * - Flag anomalies
 */
export class GSTAgent extends BaseAgent {
    private readonly GST_RATES = [0, 5, 12, 18, 28]

    constructor() {
        super({
            name: 'GSTAgent',
            description: 'GST classification and validation',
            version: '1.0.0',
            timeout: 20000,
        })
    }

    protected async validateInput(input: AgentInput): Promise<{ valid: boolean; error?: string }> {
        if (!input.payload.invoiceData && !input.payload.transactionList) {
            return { valid: false, error: 'invoiceData or transactionList is required' }
        }
        return { valid: true }
    }

    protected async executeTask(input: AgentInput): Promise<any> {
        const data = input.payload.invoiceData || input.payload.transactionList

        // Classify GST
        const categorization = await this.classifyGST(data)

        // Validate GST calculations
        const validationFlags = this.validateGST(data, categorization)

        // Calculate totals
        const summary = this.calculateGSTSummary(categorization)

        return {
            categorization,
            validationFlags,
            summary,
        }
    }

    protected async produceOutput(result: any, input: AgentInput): Promise<AgentOutput> {
        return {
            success: true,
            data: {
                gstAssessment: result.categorization,
                summary: result.summary,
            },
            flags: result.validationFlags,
            confidenceScore: result.categorization.confidence,
            nextSteps: result.validationFlags.length > 0 ? ['REVIEW'] : ['SUMMARY'],
        }
    }

    /**
     * Classify GST using LLM
     */
    private async classifyGST(data: any): Promise<GSTCategorization> {
        const prompt = `
Analyze this invoice/transaction for GST classification:

${JSON.stringify(data, null, 2)}

Determine:
1. Category: INPUT_TAX (purchase), OUTPUT_TAX (sale), EXEMPT, or ZERO_RATED
2. Applicable GST rate (0%, 5%, 12%, 18%, 28%)
3. Tax breakdown (CGST, SGST, IGST)
4. ITC (Input Tax Credit) eligibility
5. Reasoning for classification

Return JSON:
{
  "category": "INPUT_TAX|OUTPUT_TAX|EXEMPT|ZERO_RATED",
  "gstRate": number,
  "taxableAmount": number,
  "cgst": number,
  "sgst": number,
  "igst": number,
  "itcEligible": boolean,
  "reasoning": "explanation",
  "confidence": 0.0-1.0
}
`

        const result = await aiModelService.structuredOutput<any>(
            prompt,
            {
                category: 'string',
                gstRate: 'number',
                taxableAmount: 'number',
                cgst: 'number',
                sgst: 'number',
                igst: 'number',
                itcEligible: 'boolean',
                reasoning: 'string',
                confidence: 'number',
            },
            'You are a GST expert for Indian taxation.'
        )

        return {
            transactionId: data.id || 'unknown',
            ...result,
        }
    }

    /**
     * Validate GST calculations
     */
    private validateGST(data: any, categorization: GSTCategorization): AgentFlag[] {
        const flags: AgentFlag[] = []

        // Invalid GST rate
        if (!this.GST_RATES.includes(categorization.gstRate)) {
            flags.push({
                severity: 'ERROR',
                category: 'INVALID_GST_RATE',
                message: `Invalid GST rate: ${categorization.gstRate}%. Valid rates: ${this.GST_RATES.join(', ')}%`,
                suggestedAction: 'Correct GST rate',
            })
        }

        // CGST + SGST should equal total GST for intra-state
        if (categorization.cgst > 0 && categorization.sgst > 0) {
            if (Math.abs(categorization.cgst - categorization.sgst) > 0.01) {
                flags.push({
                    severity: 'WARNING',
                    category: 'GST_SPLIT_MISMATCH',
                    message: 'CGST and SGST should be equal for intra-state transactions',
                    suggestedAction: 'Verify tax split',
                })
            }
        }

        // Cannot have both IGST and CGST/SGST
        if (categorization.igst > 0 && (categorization.cgst > 0 || categorization.sgst > 0)) {
            flags.push({
                severity: 'ERROR',
                category: 'GST_TYPE_CONFLICT',
                message: 'Cannot have both IGST and CGST/SGST',
                suggestedAction: 'Use either IGST (inter-state) or CGST+SGST (intra-state)',
            })
        }

        // Verify calculated GST matches declared
        const calculatedGST = (categorization.taxableAmount * categorization.gstRate) / 100
        const declaredGST = categorization.cgst + categorization.sgst + categorization.igst

        if (Math.abs(calculatedGST - declaredGST) > 1) {
            flags.push({
                severity: 'ERROR',
                category: 'GST_CALCULATION_ERROR',
                message: `GST mismatch: Calculated ₹${calculatedGST.toFixed(2)} vs Declared ₹${declaredGST.toFixed(2)}`,
                suggestedAction: 'Recalculate GST',
            })
        }

        // Low confidence
        if (categorization.confidence < 0.7) {
            flags.push({
                severity: 'WARNING',
                category: 'LOW_CONFIDENCE',
                message: `Low GST classification confidence: ${(categorization.confidence * 100).toFixed(0)}%`,
                suggestedAction: 'Manual review recommended',
            })
        }

        return flags
    }

    /**
     * Calculate GST summary
     */
    private calculateGSTSummary(categorization: GSTCategorization) {
        return {
            category: categorization.category,
            totalGST: categorization.cgst + categorization.sgst + categorization.igst,
            taxableAmount: categorization.taxableAmount,
            effectiveRate: categorization.gstRate,
            itcEligible: categorization.itcEligible,
            itcAmount: categorization.itcEligible
                ? categorization.cgst + categorization.sgst + categorization.igst
                : 0,
        }
    }
}
