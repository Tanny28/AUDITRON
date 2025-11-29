'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    startReconcile,
    getReconcileStatus,
    getReconcileResults,
    exportReconcileToCSV,
} from '@/lib/api/reconcile'
import { JobStatus } from './JobStatus'
import type { Reconciliation } from '@/types/api'

export function ReconcilePanel() {
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [reconciliationId, setReconciliationId] = useState<string | null>(null)
    const [status, setStatus] = useState<any>(null)
    const [results, setResults] = useState<Reconciliation | null>(null)

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const response = await startReconcile({
                name,
                startDate,
                endDate,
            })

            setReconciliationId(response.reconciliationId)

            // Start polling for status
            pollStatus(response.reconciliationId)
        } catch (err: any) {
            setError(err.error || 'Failed to start reconciliation')
            setLoading(false)
        }
    }

    const pollStatus = async (id: string) => {
        const poll = async () => {
            try {
                const statusData = await getReconcileStatus(id)
                setStatus(statusData)

                if (statusData.status === 'COMPLETED') {
                    setLoading(false)
                    // Fetch full results
                    const resultsData = await getReconcileResults(id)
                    setResults(resultsData)
                } else if (statusData.status === 'FAILED') {
                    setLoading(false)
                    setError('Reconciliation failed')
                } else {
                    // Continue polling
                    setTimeout(poll, 3000)
                }
            } catch (err: any) {
                console.error('Status poll error:', err)
                setTimeout(poll, 3000) // Retry
            }
        }

        poll()
    }

    const handleExportCSV = () => {
        if (results) {
            exportReconcileToCSV(results)
        }
    }

    const handleReset = () => {
        setReconciliationId(null)
        setStatus(null)
        setResults(null)
        setName('')
        setStartDate('')
        setEndDate('')
        setError(null)
    }

    return (
        <div className="space-y-6">
            <div className="glass-card">
                <h2 className="text-2xl font-semibold mb-6">Bank Reconciliation</h2>

                {!reconciliationId ? (
                    <form onSubmit={handleStart} className="space-y-4">
                        <div>
                            <label htmlFor="recon-name" className="block text-sm font-medium mb-2">
                                Reconciliation Name
                            </label>
                            <input
                                id="recon-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder="Monthly Reconciliation - January 2025"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start-date" className="block text-sm font-medium mb-2">
                                    Start Date
                                </label>
                                <input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="end-date" className="block text-sm font-medium mb-2">
                                    End Date
                                </label>
                                <input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div
                                className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-400 text-sm"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`btn btn-primary w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="spinner" />
                                    Starting...
                                </span>
                            ) : (
                                'Start Reconciliation'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        {/* Status Summary */}
                        {status && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-glass-bg rounded-lg border border-glass-border">
                                    <p className="text-sm text-text-gray mb-1">Status</p>
                                    <p className="text-lg font-semibold capitalize">
                                        {status.status.toLowerCase().replace('_', ' ')}
                                    </p>
                                </div>

                                <div className="p-4 bg-glass-bg rounded-lg border border-glass-border">
                                    <p className="text-sm text-text-gray mb-1">Matched</p>
                                    <p className="text-lg font-semibold text-green-400">
                                        {status.totalMatched}
                                    </p>
                                </div>

                                <div className="p-4 bg-glass-bg rounded-lg border border-glass-border">
                                    <p className="text-sm text-text-gray mb-1">Unmatched</p>
                                    <p className="text-lg font-semibold text-red-400">
                                        {status.totalUnmatched}
                                    </p>
                                </div>

                                <div className="p-4 bg-glass-bg rounded-lg border border-glass-border">
                                    <p className="text-sm text-text-gray mb-1">Amount Matched</p>
                                    <p className="text-lg font-semibold text-accent-gold">
                                        ₹{status.matchedAmount?.toLocaleString() || 0}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Results Table */}
                        {results && results.matches && results.matches.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-glass-border">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                Match Type
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                Score
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                Transaction ID
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                Ledger Entry ID
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.matches.slice(0, 10).map((match: any, index: number) => (
                                            <tr key={index} className="border-b border-glass-border hover:bg-glass-bg">
                                                <td className="py-3 px-4 text-sm">{match.matchType}</td>
                                                <td className="py-3 px-4 text-sm">
                                                    {(match.matchScore * 100).toFixed(0)}%
                                                </td>
                                                <td className="py-3 px-4 text-sm font-mono text-xs">
                                                    {match.transactionId?.substring(0, 8)}...
                                                </td>
                                                <td className="py-3 px-4 text-sm font-mono text-xs">
                                                    {match.ledgerEntryId?.substring(0, 8)}...
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {results.matches.length > 10 && (
                                    <p className="text-sm text-text-gray mt-2 text-center">
                                        Showing 10 of {results.matches.length} matches
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4">
                            {status?.status === 'COMPLETED' && (
                                <button onClick={handleExportCSV} className="btn btn-gold">
                                    Export to CSV
                                </button>
                            )}
                            <button onClick={handleReset} className="btn btn-outline">
                                Start New Reconciliation
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
