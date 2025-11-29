import { BaseAgent } from './base/BaseAgent'
import type { AgentInput, AgentOutput, ReconciliationMatch, ReconciliationResult, AgentFlag } from '../types/agent'
import { aiModelService } from '../services/AiModelService'
import { prisma } from '../lib/prisma'

/**
 * ReconciliationAgent - Match ledger entries with bank statements
 * 
 * Responsibilities:
 * - Fuzzy matching using LLM reasoning
 * - Name similarity, amount approximation
 * - Reference number heuristics
 * - Produce matched/unmatched lists
 */
export class ReconciliationAgent extends BaseAgent {
    constructor() {
        super({
            name: 'ReconciliationAgent',
            description: 'Reconciles ledger entries with bank statements',
            version: '1.0.0',
            timeout: 60000,
        })
    }

    protected async validateInput(input: AgentInput): Promise<{ valid: boolean; error?: string }> {
        if (!input.payload.reconciliationId) {
            return { valid: false, error: 'reconciliationId is required' }
        }
        return { valid: true }
    }

    protected async executeTask(input: AgentInput): Promise<any> {
        const { reconciliationId } = input.payload

        // Fetch reconciliation record
        const reconciliation = await prisma.reconciliation.findUnique({
            where: { id: reconciliationId },
        })

        if (!reconciliation) {
            throw new Error('Reconciliation not found')
        }

        // Fetch transactions and ledger entries for the period
        const transactions = await prisma.transaction.findMany({
            where: {
                orgId: reconciliation.orgId,
                transactionDate: {
                    gte: reconciliation.startDate,
                    lte: reconciliation.endDate,
                },
                isReconciled: false,
            },
        })

        // TODO: Fetch bank statement entries (add BankStatement model)
        // For now, we'll use a placeholder
        const bankEntries: any[] = []

        // Normalize data
        const normalizedTransactions = this.normalizeTransactions(transactions)
        const normalizedBankEntries = this.normalizeTransactions(bankEntries)

        // Perform matching
        const matches = await this.performMatching(
            normalizedTransactions,
            normalizedBankEntries,
            reconciliation.id
        )

        // Generate summary
        const summary = this.generateSummary(matches, normalizedTransactions, normalizedBankEntries)

        return {
            reconciliation,
            matches,
            summary,
        }
    }

    protected async produceOutput(result: any, input: AgentInput): Promise<AgentOutput> {
        const { reconciliation, matches, summary } = result

        // Save matches to database
        for (const match of matches.matched) {
            await prisma.reconciliationMatch.create({
                data: {
                    reconciliationId: reconciliation.id,
                    transactionId: match.transactionId,
                    ledgerEntryId: match.ledgerEntryId,
                    matchType: match.matchType,
                    matchScore: match.matchScore,
                    confidence: match.confidence,
                },
            })

            // Mark transaction as reconciled
            await prisma.transaction.update({
                where: { id: match.transactionId },
                data: { isReconciled: true },
            })
        }

        // Update reconciliation status
        await prisma.reconciliation.update({
            where: { id: reconciliation.id },
            data: {
                status: 'COMPLETED',
                totalMatched: summary.totalMatched,
                totalUnmatched: summary.totalUnmatched,
                matchedAmount: summary.matchedAmount,
                unmatchedAmount: summary.unmatchedAmount,
                completedAt: new Date(),
            },
        })

        return {
            success: true,
            data: {
                reconciliationResult: {
                    reconciliationId: reconciliation.id,
                    matched: matches.matched,
                    unmatched: matches.unmatched,
                    summary,
                    flags: matches.flags,
                },
            },
            confidenceScore: summary.averageConfidence,
            flags: matches.flags,
            nextSteps: ['SUMMARY'],
        }
    }

    /**
     * Normalize transactions for matching
     */
    private normalizeTransactions(transactions: any[]): any[] {
        return transactions.map((txn) => ({
            id: txn.id,
            date: txn.transactionDate || txn.date,
            description: (txn.description || '').toLowerCase().trim(),
            amount: Math.abs(txn.amount),
            type: txn.type,
            reference: txn.referenceNumber || '',
        }))
    }

    /**
     * Perform matching between transactions and bank entries
     */
    private async performMatching(
        transactions: any[],
        bankEntries: any[],
        reconciliationId: string
    ): Promise<{
        matched: ReconciliationMatch[]
        unmatched: { transactions: string[]; ledgerEntries: string[] }
        flags: AgentFlag[]
    }> {
        const matched: ReconciliationMatch[] = []
        const unmatchedTransactions = new Set(transactions.map((t) => t.id))
        const unmatchedBankEntries = new Set(bankEntries.map((b) => b.id))
        const flags: AgentFlag[] = []

        // Exact matches first
        for (const txn of transactions) {
            for (const bank of bankEntries) {
                if (this.isExactMatch(txn, bank)) {
                    matched.push({
                        matchType: 'EXACT',
                        matchScore: 1.0,
                        transactionId: txn.id,
                        ledgerEntryId: bank.id,
                        amount: txn.amount,
                        confidence: 1.0,
                    })
                    unmatchedTransactions.delete(txn.id)
                    unmatchedBankEntries.delete(bank.id)
                }
            }
        }

        // Fuzzy matches using LLM
        const remainingTxns = transactions.filter((t) => unmatchedTransactions.has(t.id))
        const remainingBank = bankEntries.filter((b) => unmatchedBankEntries.has(b.id))

        if (remainingTxns.length > 0 && remainingBank.length > 0) {
            const fuzzyMatches = await this.fuzzyMatchWithLLM(remainingTxns, remainingBank)

            for (const match of fuzzyMatches) {
                if (match.confidence >= 0.7) {
                    matched.push(match)
                    unmatchedTransactions.delete(match.transactionId)
                    unmatchedBankEntries.delete(match.ledgerEntryId)
                } else {
                    flags.push({
                        severity: 'WARNING',
                        category: 'LOW_CONFIDENCE_MATCH',
                        message: `Low confidence match (${(match.confidence * 100).toFixed(0)}%) for transaction ${match.transactionId}`,
                        suggestedAction: 'Manual review recommended',
                    })
                }
            }
        }

        return {
            matched,
            unmatched: {
                transactions: Array.from(unmatchedTransactions),
                ledgerEntries: Array.from(unmatchedBankEntries),
            },
            flags,
        }
    }

    /**
     * Check for exact match
     */
    private isExactMatch(txn: any, bank: any): boolean {
        const amountMatch = Math.abs(txn.amount - bank.amount) < 0.01
        const dateMatch = new Date(txn.date).toDateString() === new Date(bank.date).toDateString()
        const descMatch = txn.description === bank.description

        return amountMatch && dateMatch && descMatch
    }

    /**
     * Fuzzy matching using LLM
     */
    private async fuzzyMatchWithLLM(
        transactions: any[],
        bankEntries: any[]
    ): Promise<ReconciliationMatch[]> {
        try {
            // Limit to prevent token overflow
            const txnSample = transactions.slice(0, 20)
            const bankSample = bankEntries.slice(0, 20)

            const prompt = `
You are an expert accountant performing bank reconciliation. Match these ledger transactions with bank statement entries.

Ledger Transactions:
${JSON.stringify(txnSample, null, 2)}

Bank Entries:
${JSON.stringify(bankSample, null, 2)}

For each potential match, consider:
- Amount similarity (exact or within ₹10)
- Date proximity (within 3 days)
- Description similarity (vendor name, reference)
- Common patterns (fees, transfers, payments)

Return JSON array of matches:
[{
  "transactionId": "txn_id",
  "ledgerEntryId": "bank_id",
  "matchScore": 0.0-1.0,
  "confidence": 0.0-1.0,
  "reasoning": "why matched"
}]

Only include matches with confidence >= 0.5.
`

            const result = await aiModelService.structuredOutput<{ matches: any[] }>(
                prompt,
                { matches: 'array' },
                'You are a financial reconciliation expert.'
            )

            return result.matches.map((m) => ({
                matchType: 'FUZZY' as const,
                matchScore: m.matchScore,
                transactionId: m.transactionId,
                ledgerEntryId: m.ledgerEntryId,
                amount: 0, // Will be filled from actual transaction
                reasoning: m.reasoning,
                confidence: m.confidence,
            }))
        } catch (error) {
            this.logger.warn('LLM fuzzy matching failed', { error })
            return []
        }
    }

    /**
     * Generate reconciliation summary
     */
    private generateSummary(
        matches: any,
        transactions: any[],
        bankEntries: any[]
    ): ReconciliationResult['summary'] {
        const matchedAmount = matches.matched.reduce((sum: number, m: any) => sum + m.amount, 0)
        const unmatchedAmount = transactions
            .filter((t) => matches.unmatched.transactions.includes(t.id))
            .reduce((sum, t) => sum + t.amount, 0)

        const avgConfidence =
            matches.matched.length > 0
                ? matches.matched.reduce((sum: number, m: any) => sum + m.confidence, 0) / matches.matched.length
                : 0

        return {
            totalMatched: matches.matched.length,
            totalUnmatched: matches.unmatched.transactions.length + matches.unmatched.ledgerEntries.length,
            matchedAmount,
            unmatchedAmount,
            averageConfidence: avgConfidence,
        }
    }
}
