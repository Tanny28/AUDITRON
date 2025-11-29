'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { ReportFilters } from '@/components/ReportCard'
import { ReportCard } from '@/components/ReportCard'
import { ExportButtons } from '@/components/ExportButtons'
import { getPnl } from '@/lib/api/reports'
import { motion } from 'framer-motion'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import type { PnlReport, PnlLineItem } from '@/types/reports'

export default function PnLReportPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [report, setReport] = useState<PnlReport | null>(null)
    const [filters, setFilters] = useState({
        from: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    })

    useEffect(() => {
        fetchReport()
    }, [filters])

    const fetchReport = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getPnl(filters.from, filters.to)
            setReport(data)
        } catch (err: any) {
            setError(err.error || 'Failed to load P&L report')
        } finally {
            setLoading(false)
        }
    }

    const chartData = report
        ? [
            { name: 'Revenue', value: report.revenue.total },
            { name: 'COGS', value: report.cogs.total },
            { name: 'Expenses', value: report.expenses.total },
            { name: 'Net Profit', value: report.netProfit },
        ]
        : []

    const exportData = report
        ? [
            ...report.revenue.items.map((item) => ({
                Category: 'Revenue',
                SubCategory: item.category,
                Amount: item.amount,
            })),
            ...report.expenses.items.map((item) => ({
                Category: 'Expense',
                SubCategory: item.category,
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
                            <h1 className="text-3xl font-semibold mb-2">Profit & Loss Statement</h1>
                            <p className="text-text-gray">
                                {new Date(filters.from).toLocaleDateString()} -{' '}
                                {new Date(filters.to).toLocaleDateString()}
                            </p>
                        </div>
                        {report && <ExportButtons data={exportData} filename="pnl-report" />}
                    </div>

                    {/* Filters */}
                    <ReportFilters
                        onChange={(newFilters) => setFilters({ from: newFilters.from, to: newFilters.to })}
                        showCompare={false}
                    />

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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <ReportCard
                                    title="Total Revenue"
                                    value={report.revenue.total}
                                    delay={0}
                                />
                                <ReportCard
                                    title="Gross Profit"
                                    value={report.grossProfit}
                                    delta={report.grossProfitMargin}
                                    delay={0.1}
                                />
                                <ReportCard
                                    title="Total Expenses"
                                    value={report.expenses.total}
                                    delay={0.2}
                                />
                                <ReportCard
                                    title="Net Profit"
                                    value={report.netProfit}
                                    delta={report.netProfitMargin}
                                    delay={0.3}
                                />
                            </div>

                            {/* Chart */}
                            <div className="glass-card">
                                <h2 className="text-xl font-semibold mb-6">Financial Overview</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#a1a1aa" />
                                        <YAxis stroke="#a1a1aa" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1a1a1a',
                                                border: '1px solid #333',
                                                borderRadius: '8px',
                                            }}
                                        />
                                        <Bar dataKey="value" fill="#d4b861" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Detailed Table */}
                            <div className="glass-card">
                                <h2 className="text-xl font-semibold mb-6">Detailed Breakdown</h2>

                                {/* Revenue */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold mb-4 text-accent-gold">Revenue</h3>
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-glass-border">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                    Category
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    Amount
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    %
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.revenue.items.map((item, index) => (
                                                <tr key={index} className="border-b border-glass-border hover:bg-glass-bg">
                                                    <td className="py-3 px-4">{item.category}</td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.amount.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-text-gray">
                                                        {item.percentage?.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="font-semibold">
                                                <td className="py-3 px-4">Total Revenue</td>
                                                <td className="py-3 px-4 text-right font-mono text-accent-gold">
                                                    ₹{report.revenue.total.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right">100%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Expenses */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 text-red-400">Expenses</h3>
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-glass-border">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                    Category
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    Amount
                                                </th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    %
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.expenses.items.map((item, index) => (
                                                <tr key={index} className="border-b border-glass-border hover:bg-glass-bg">
                                                    <td className="py-3 px-4">{item.category}</td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        ₹{item.amount.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-text-gray">
                                                        {item.percentage?.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="font-semibold">
                                                <td className="py-3 px-4">Total Expenses</td>
                                                <td className="py-3 px-4 text-right font-mono text-red-400">
                                                    ₹{report.expenses.total.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right">100%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Net Profit */}
                                <div className="mt-8 p-6 bg-accent-gold bg-opacity-10 rounded-lg border border-accent-gold">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-2xl font-bold">Net Profit</h3>
                                        <p className="text-3xl font-bold text-accent-gold">
                                            ₹{report.netProfit.toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="text-text-gray mt-2">
                                        Margin: {report.netProfitMargin.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
