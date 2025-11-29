'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { ReportFilters } from '@/components/ReportFilters'
import { ExportButtons } from '@/components/ExportButtons'
import { getTimeSeries } from '@/lib/api/reports'
import { motion } from 'framer-motion'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import type { TimeSeries } from '@/types/reports'

export default function TimeSeriesPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [report, setReport] = useState<TimeSeries | null>(null)
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'expense', 'profit'])
    const [filters, setFilters] = useState({
        from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    })

    useEffect(() => {
        fetchReport()
    }, [filters, selectedMetrics])

    const fetchReport = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getTimeSeries(selectedMetrics, filters.from, filters.to, 'monthly')
            setReport(data)
        } catch (err: any) {
            setError(err.error || 'Failed to load time series data')
        } finally {
            setLoading(false)
        }
    }

    const toggleMetric = (metric: string) => {
        setSelectedMetrics((prev) =>
            prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
        )
    }

    const exportData = report
        ? report.data.map((point) => ({
            Date: point.date,
            Revenue: point.revenue || 0,
            Expense: point.expense || 0,
            Profit: point.profit || 0,
        }))
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
                            <h1 className="text-3xl font-semibold mb-2">Time Series Analytics</h1>
                            <p className="text-text-gray">
                                {new Date(filters.from).toLocaleDateString()} -{' '}
                                {new Date(filters.to).toLocaleDateString()}
                            </p>
                        </div>
                        {report && <ExportButtons data={exportData} filename="time-series" />}
                    </div>

                    {/* Filters */}
                    <ReportFilters
                        onChange={(newFilters) => setFilters({ from: newFilters.from, to: newFilters.to })}
                        showCompare={false}
                    />

                    {/* Metric Toggles */}
                    <div className="glass-card">
                        <h3 className="text-sm font-medium mb-3">Select Metrics</h3>
                        <div className="flex gap-3">
                            {['revenue', 'expense', 'profit'].map((metric) => (
                                <button
                                    key={metric}
                                    onClick={() => toggleMetric(metric)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedMetrics.includes(metric)
                                            ? 'bg-accent-gold text-bg-dark'
                                            : 'bg-glass-bg border border-glass-border text-text-gray hover:border-accent-gold'
                                        }`}
                                >
                                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                                </button>
                            ))}
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

                    {report && report.data.length > 0 && (
                        <>
                            {/* Chart */}
                            <div className="glass-card">
                                <h2 className="text-xl font-semibold mb-6">Trend Analysis</h2>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={report.data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#a1a1aa"
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                                        />
                                        <YAxis stroke="#a1a1aa" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1a1a1a',
                                                border: '1px solid #333',
                                                borderRadius: '8px',
                                            }}
                                            formatter={(value: any) => `₹${value.toLocaleString()}`}
                                        />
                                        <Legend />
                                        {selectedMetrics.includes('revenue') && (
                                            <Line
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#4ade80"
                                                strokeWidth={2}
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        )}
                                        {selectedMetrics.includes('expense') && (
                                            <Line
                                                type="monotone"
                                                dataKey="expense"
                                                stroke="#f87171"
                                                strokeWidth={2}
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        )}
                                        {selectedMetrics.includes('profit') && (
                                            <Line
                                                type="monotone"
                                                dataKey="profit"
                                                stroke="#d4b861"
                                                strokeWidth={2}
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Data Table */}
                            <div className="glass-card">
                                <h2 className="text-xl font-semibold mb-6">Detailed Data</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-glass-border">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-text-gray">
                                                    Period
                                                </th>
                                                {selectedMetrics.includes('revenue') && (
                                                    <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                        Revenue
                                                    </th>
                                                )}
                                                {selectedMetrics.includes('expense') && (
                                                    <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                        Expense
                                                    </th>
                                                )}
                                                {selectedMetrics.includes('profit') && (
                                                    <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                        Profit
                                                    </th>
                                                )}
                                                <th className="text-right py-3 px-4 text-sm font-medium text-text-gray">
                                                    MoM Change
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.data.map((point, index) => {
                                                const prevPoint = index > 0 ? report.data[index - 1] : null
                                                const change = prevPoint && point.profit && prevPoint.profit
                                                    ? ((point.profit - prevPoint.profit) / prevPoint.profit) * 100
                                                    : 0

                                                return (
                                                    <tr key={point.date} className="border-b border-glass-border hover:bg-glass-bg">
                                                        <td className="py-3 px-4">
                                                            {new Date(point.date).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                year: 'numeric',
                                                            })}
                                                        </td>
                                                        {selectedMetrics.includes('revenue') && (
                                                            <td className="py-3 px-4 text-right font-mono text-green-400">
                                                                ₹{(point.revenue || 0).toLocaleString()}
                                                            </td>
                                                        )}
                                                        {selectedMetrics.includes('expense') && (
                                                            <td className="py-3 px-4 text-right font-mono text-red-400">
                                                                ₹{(point.expense || 0).toLocaleString()}
                                                            </td>
                                                        )}
                                                        {selectedMetrics.includes('profit') && (
                                                            <td className="py-3 px-4 text-right font-mono text-accent-gold">
                                                                ₹{(point.profit || 0).toLocaleString()}
                                                            </td>
                                                        )}
                                                        <td className={`py-3 px-4 text-right text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'
                                                            }`}>
                                                            {change !== 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : '-'}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
