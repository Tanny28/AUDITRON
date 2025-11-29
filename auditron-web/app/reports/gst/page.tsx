'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { ReportCard } from '@/components/ReportCard'
import { ExportButtons } from '@/components/ExportButtons'
import { getGst, generateGstReturn } from '@/lib/api/reports'
import { motion } from 'framer-motion'
import type { GstReport } from '@/types/reports'

export default function GSTReportPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [report, setReport] = useState<GstReport | null>(null)
    const [generating, setGenerating] = useState(false)

    // Default to current month
    const [period, setPeriod] = useState(() => {
        const date = new Date()
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    })

    useEffect(() => {
        fetchReport()
    }, [period])

    const fetchReport = async () => {
        try {
            setLoading(true)
            setError(null)

            // Convert YYYY-MM to date range
            const [year, month] = period.split('-')
            const from = `${year}-${month}-01`
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
            const to = `${year}-${month}-${lastDay}`

            const data = await getGst(from, to)
            setReport(data)
        } catch (err: any) {
            setError(err.error || 'Failed to load GST report')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateReturn = async () => {
        try {
            setGenerating(true)
            const result = await generateGstReturn(period)

            if (result.url) {
                window.open(result.url, '_blank')
            } else {
                alert(result.message || 'GST return generated successfully')
            }
        } catch (err: any) {
            alert(err.error || 'Failed to generate GST return')
        } finally {
            setGenerating(false)
        }
    }

    const exportData = report
        ? [
            ...report.sales.items.map((item) => ({
                Type: 'Sales',
                Description: item.description,
                TaxableValue: item.taxableValue,
                CGST: item.cgst,
                SGST: item.sgst,
                IGST: item.igst,
                Total: item.total,
            })),
            ...report.purchases.items.map((item) => ({
                Type: 'Purchases',
                Description: item.description,
                TaxableValue: item.taxableValue,
                CGST: item.cgst,
                SGST: item.sgst,
                IGST: item.igst,
                Total: item.total,
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
                            <h1 className="text-3xl font-semibold mb-2">GST Report</h1>
                            <p className="text-text-gray">Period: {period}</p>
                            {report?.gstNumber && (
                                <p className="text-sm text-text-gray">GSTIN: {report.gstNumber}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {report && <ExportButtons data={exportData} filename={`gst-${period}`} />}
                            <button
                                onClick={handleGenerateReturn}
                                disabled={generating}
                                className="btn btn-gold"
                            >
                                {generating ? 'Generating...' : 'Generate GST Return'}
                            </button>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="glass-card">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label htmlFor="period" className="block text-sm font-medium mb-2">
                                    Select Period (Month)
                                </label>
                                <input
                                    id="period"
                                    type="month"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
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
                            {/* Filing Status */}
                            {report.filedStatus !== 'FILED' && (
                                <div className="p-4 bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg text-yellow-400">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span className="font-medium">
                                            {report.filedStatus === 'LATE' ? 'Filing Overdue' : 'Not Filed'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <ReportCard
                                    title="Tax Collected"
                                    value={report.taxCollected}
                                    delay={0}
                                />
                                <ReportCard
                                    title="Tax Payable"
                                    value={report.taxPayable}
                                    delay={0.1}
                                />
                                <ReportCard
                                    title="Net Tax"
                                    value={report.netTax}
                                    delay={0.2}
                                />
                                <div className="glass-card">
                                    <p className="text-sm text-text-gray mb-1">Filing Status</p>
                                    <p className={`text-2xl font-bold ${report.filedStatus === 'FILED' ? 'text-green-400' :
                                            report.filedStatus === 'LATE' ? 'text-red-400' :
                                                'text-yellow-400'
                                        }`}>
                                        {report.filedStatus.replace('_', ' ')}
                                    </p>
                                    {report.filedDate && (
                                        <p className="text-xs text-text-gray mt-2">
                                            Filed: {new Date(report.filedDate).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Sales (Output Tax) */}
                            <div className="glass-card">
                                <h2 className="text-2xl font-semibold mb-6 text-green-400">
                                    Sales (Output Tax)
                                </h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-glass-border">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                    Description
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    Taxable Value
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    CGST
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    SGST
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    IGST
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.sales.items.map((item, index) => (
                                                <tr key={index} className="border-b border-glass-border hover:bg-glass-bg">
                                                    <td className="py-3 px-4">{item.description}</td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.taxableValue.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.cgst.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.sgst.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.igst.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.total.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="font-semibold bg-green-500 bg-opacity-10">
                                                <td className="py-3 px-4">Total Sales</td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{report.sales.taxable.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{report.sales.cgst.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{report.sales.sgst.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{report.sales.igst.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-green-400">
                                                    ₹{report.sales.total.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Purchases (Input Tax) */}
                            <div className="glass-card">
                                <h2 className="text-2xl font-semibold mb-6 text-blue-400">
                                    Purchases (Input Tax)
                                </h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-glass-border">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                    Description
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    Taxable Value
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    CGST
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    SGST
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    IGST
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.purchases.items.map((item, index) => (
                                                <tr key={index} className="border-b border-glass-border hover:bg-glass-bg">
                                                    <td className="py-3 px-4">{item.description}</td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.taxableValue.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.cgst.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.sgst.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.igst.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.total.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="font-semibold bg-blue-500 bg-opacity-10">
                                                <td className="py-3 px-4">Total Purchases</td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{report.purchases.taxable.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{report.purchases.cgst.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{report.purchases.sgst.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">
                                                    ₹{report.purchases.igst.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-blue-400">
                                                    ₹{report.purchases.total.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Net Tax Summary */}
                            <div className="glass-card bg-accent-gold bg-opacity-10 border-accent-gold">
                                <h3 className="text-xl font-semibold mb-4">Tax Summary</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-lg">
                                        <span>Output Tax (Sales)</span>
                                        <span className="font-mono">₹{report.taxCollected.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-lg">
                                        <span>Input Tax (Purchases)</span>
                                        <span className="font-mono">₹{report.taxPayable.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-2xl font-bold pt-3 border-t border-accent-gold">
                                        <span>Net Tax {report.netTax >= 0 ? 'Payable' : 'Refundable'}</span>
                                        <span className="font-mono text-accent-gold">
                                            ₹{Math.abs(report.netTax).toLocaleString()}
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
