'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { ReportFilters } from '@/components/ReportFilters'
import { ReportCard } from '@/components/ReportCard'
import { ExportButtons } from '@/components/ExportButtons'
import { getBalanceSheet } from '@/lib/api/reports'
import { motion } from 'framer-motion'
import type { BalanceSheet, BalanceSheetAccount } from '@/types/reports'

export default function BalanceSheetPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [report, setReport] = useState<BalanceSheet | null>(null)
    const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0])
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchReport()
    }, [asOf])

    const fetchReport = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getBalanceSheet(asOf)
            setReport(data)
        } catch (err: any) {
            setError(err.error || 'Failed to load Balance Sheet')
        } finally {
            setLoading(false)
        }
    }

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections)
        if (newExpanded.has(section)) {
            newExpanded.delete(section)
        } else {
            newExpanded.add(section)
        }
        setExpandedSections(newExpanded)
    }

    const renderAccount = (account: BalanceSheetAccount, level = 0) => (
        <div key={account.name} style={{ paddingLeft: `${level * 20}px` }}>
            <div className="flex justify-between py-2 hover:bg-glass-bg">
                <div className="flex items-center gap-2">
                    {account.children && account.children.length > 0 && (
                        <button
                            onClick={() => toggleSection(account.name)}
                            className="text-accent-gold"
                        >
                            {expandedSections.has(account.name) ? '▼' : '▶'}
                        </button>
                    )}
                    <span className={level === 0 ? 'font-semibold' : ''}>{account.name}</span>
                </div>
                <span className="font-mono">₹{account.amount.toLocaleString()}</span>
            </div>
            {account.children &&
                expandedSections.has(account.name) &&
                account.children.map((child) => renderAccount(child, level + 1))}
        </div>
    )

    const exportData = report
        ? [
            ...report.assets.current.items.map((item) => ({
                Section: 'Assets - Current',
                Account: item.name,
                Amount: item.amount,
            })),
            ...report.assets.nonCurrent.items.map((item) => ({
                Section: 'Assets - Non-Current',
                Account: item.name,
                Amount: item.amount,
            })),
            ...report.liabilities.current.items.map((item) => ({
                Section: 'Liabilities - Current',
                Account: item.name,
                Amount: item.amount,
            })),
            ...report.liabilities.nonCurrent.items.map((item) => ({
                Section: 'Liabilities - Non-Current',
                Account: item.name,
                Amount: item.amount,
            })),
            ...report.equity.items.map((item) => ({
                Section: 'Equity',
                Account: item.name,
                Amount: item.amount,
            })),
        ]
        : []

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header />
                <div className="pt-32 container mx-auto px-6">
                    <div className="flex items-center justify-center py-20">
                        <div className="spinner" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Header />

            <div className="pt-32 pb-20 container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold mb-2">Balance Sheet</h1>
                            <p className="text-text-gray">
                                As of {new Date(asOf).toLocaleDateString()}
                            </p>
                        </div>
                        {report && <ExportButtons data={exportData} filename="balance-sheet" />}
                    </div>

                    {/* Date Selector */}
                    <div className="glass-card">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label htmlFor="as-of-date" className="block text-sm font-medium mb-2">
                                    As of Date
                                </label>
                                <input
                                    id="as-of-date"
                                    type="date"
                                    value={asOf}
                                    onChange={(e) => setAsOf(e.target.value)}
                                    className="input"
                                />
                            </div>
                            <button onClick={fetchReport} className="btn btn-primary">
                                Refresh
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-400">
                            {error}
                            <button onClick={fetchReport} className="ml-4 underline">
                                Retry
                            </button>
                        </div>
                    )}

                    {report && (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ReportCard
                                    title="Total Assets"
                                    value={report.assets.total}
                                    delay={0}
                                />
                                <ReportCard
                                    title="Total Liabilities"
                                    value={report.liabilities.total}
                                    delay={0.1}
                                />
                                <ReportCard
                                    title="Total Equity"
                                    value={report.equity.total}
                                    delay={0.2}
                                />
                            </div>

                            {/* Assets */}
                            <div className="glass-card">
                                <h2 className="text-2xl font-semibold mb-6 text-accent-gold">Assets</h2>

                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-3">Current Assets</h3>
                                    {report.assets.current.items.map((item) => renderAccount(item))}
                                    <div className="flex justify-between py-2 mt-2 border-t border-glass-border font-semibold">
                                        <span>Total Current Assets</span>
                                        <span className="font-mono">
                                            ₹{report.assets.current.total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Non-Current Assets</h3>
                                    {report.assets.nonCurrent.items.map((item) => renderAccount(item))}
                                    <div className="flex justify-between py-2 mt-2 border-t border-glass-border font-semibold">
                                        <span>Total Non-Current Assets</span>
                                        <span className="font-mono">
                                            ₹{report.assets.nonCurrent.total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between py-3 mt-4 border-t-2 border-accent-gold font-bold text-lg">
                                    <span>TOTAL ASSETS</span>
                                    <span className="font-mono text-accent-gold">
                                        ₹{report.assets.total.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Liabilities */}
                            <div className="glass-card">
                                <h2 className="text-2xl font-semibold mb-6 text-red-400">Liabilities</h2>

                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-3">Current Liabilities</h3>
                                    {report.liabilities.current.items.map((item) => renderAccount(item))}
                                    <div className="flex justify-between py-2 mt-2 border-t border-glass-border font-semibold">
                                        <span>Total Current Liabilities</span>
                                        <span className="font-mono">
                                            ₹{report.liabilities.current.total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Non-Current Liabilities</h3>
                                    {report.liabilities.nonCurrent.items.map((item) => renderAccount(item))}
                                    <div className="flex justify-between py-2 mt-2 border-t border-glass-border font-semibold">
                                        <span>Total Non-Current Liabilities</span>
                                        <span className="font-mono">
                                            ₹{report.liabilities.nonCurrent.total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between py-3 mt-4 border-t-2 border-red-400 font-bold text-lg">
                                    <span>TOTAL LIABILITIES</span>
                                    <span className="font-mono text-red-400">
                                        ₹{report.liabilities.total.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Equity */}
                            <div className="glass-card">
                                <h2 className="text-2xl font-semibold mb-6 text-blue-400">Equity</h2>
                                {report.equity.items.map((item) => renderAccount(item))}
                                <div className="flex justify-between py-3 mt-4 border-t-2 border-blue-400 font-bold text-lg">
                                    <span>TOTAL EQUITY</span>
                                    <span className="font-mono text-blue-400">
                                        ₹{report.equity.total.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Accounting Equation Verification */}
                            <div className="glass-card bg-accent-gold bg-opacity-10 border-accent-gold">
                                <h3 className="text-lg font-semibold mb-4">Accounting Equation</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Assets</span>
                                        <span className="font-mono">₹{report.assets.total.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Liabilities + Equity</span>
                                        <span className="font-mono">
                                            ₹{(report.liabilities.total + report.equity.total).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-accent-gold pt-2 border-t border-accent-gold">
                                        <span>Balanced</span>
                                        <span>
                                            {Math.abs(report.assets.total - (report.liabilities.total + report.equity.total)) < 0.01
                                                ? '✓ Yes'
                                                : '✗ No'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
