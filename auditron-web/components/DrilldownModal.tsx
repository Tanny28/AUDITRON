'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/apiClient'
import { exportToCSV } from '@/lib/api/reports'
import type { Transaction } from '@/types/api'

interface DrilldownModalProps {
    isOpen: boolean
    onClose: () => void
    category: string
    from: string
    to: string
}

export function DrilldownModal({
    isOpen,
    onClose,
    category,
    from,
    to,
}: DrilldownModalProps) {
    const [loading, setLoading] = useState(false)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const limit = 10

    useEffect(() => {
        if (isOpen) {
            fetchTransactions()
        }
    }, [isOpen, category, from, to, page])

    const fetchTransactions = async () => {
        try {
            setLoading(true)
            const response = await apiClient.listTransactions({
                page,
                limit,
                category,
                // TODO: Add date range filters when backend supports them
            })
            setTransactions(response.data)
            setTotal(response.pagination.total)
        } catch (error) {
            console.error('Failed to fetch transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleExport = () => {
        const exportData = transactions.map((txn) => ({
            Date: new Date(txn.transactionDate).toLocaleDateString(),
            Description: txn.description,
            Category: txn.category || '',
            Type: txn.type,
            Amount: txn.amount,
        }))
        exportToCSV(exportData, `transactions-${category}`)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onKeyDown={handleKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black bg-opacity-70"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    className="relative glass-card max-w-4xl w-full max-h-[80vh] overflow-hidden"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-glass-border">
                        <div>
                            <h2 id="modal-title" className="text-2xl font-semibold">
                                Transactions: {category}
                            </h2>
                            <p className="text-sm text-text-gray mt-1">
                                {new Date(from).toLocaleDateString()} - {new Date(to).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-text-gray hover:text-text-white transition-colors"
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="spinner" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-12 text-text-gray">
                                No transactions found for this category
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-glass-border">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                Date
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                Description
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                Type
                                            </th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((txn) => (
                                            <tr key={txn.id} className="border-b border-glass-border hover:bg-glass-bg">
                                                <td className="py-3 px-4 text-sm">
                                                    {new Date(txn.transactionDate).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 px-4">{txn.description}</td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs ${txn.type === 'DEBIT'
                                                                ? 'bg-red-500 bg-opacity-20 text-red-400'
                                                                : 'bg-green-500 bg-opacity-20 text-green-400'
                                                            }`}
                                                    >
                                                        {txn.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{txn.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {total > limit && (
                            <div className="flex items-center justify-between mt-6">
                                <p className="text-sm text-text-gray">
                                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="btn btn-outline text-sm"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={page * limit >= total}
                                        className="btn btn-outline text-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-glass-border">
                        <button onClick={handleExport} className="btn btn-gold">
                            Export CSV
                        </button>
                        <button onClick={onClose} className="btn btn-outline">
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
