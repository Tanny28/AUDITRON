'use client'

import { useState } from 'react'
import type { ReportFilters } from '@/types/reports'

interface ReportFiltersProps {
    onChange: (filters: ReportFilters) => void
    showCompare?: boolean
}

export function ReportFilters({ onChange, showCompare = true }: ReportFiltersProps) {
    const [from, setFrom] = useState(() => {
        const date = new Date()
        date.setMonth(date.getMonth() - 3)
        return date.toISOString().split('T')[0]
    })

    const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
    const [compare, setCompare] = useState(false)

    const handleApply = () => {
        onChange({ from, to, compare })
    }

    const setPreset = (preset: 'ytd' | 'last3m' | 'last6m' | 'last12m') => {
        const today = new Date()
        const toDate = today.toISOString().split('T')[0]
        let fromDate: string

        switch (preset) {
            case 'ytd':
                fromDate = `${today.getFullYear()}-01-01`
                break
            case 'last3m':
                const date3m = new Date()
                date3m.setMonth(date3m.getMonth() - 3)
                fromDate = date3m.toISOString().split('T')[0]
                break
            case 'last6m':
                const date6m = new Date()
                date6m.setMonth(date6m.getMonth() - 6)
                fromDate = date6m.toISOString().split('T')[0]
                break
            case 'last12m':
                const date12m = new Date()
                date12m.setFullYear(date12m.getFullYear() - 1)
                fromDate = date12m.toISOString().split('T')[0]
                break
        }

        setFrom(fromDate)
        setTo(toDate)
        onChange({ from: fromDate, to: toDate, compare })
    }

    return (
        <div className="glass-card">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                {/* Date Range */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="from-date" className="block text-sm font-medium mb-2">
                            From
                        </label>
                        <input
                            id="from-date"
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label htmlFor="to-date" className="block text-sm font-medium mb-2">
                            To
                        </label>
                        <input
                            id="to-date"
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="input"
                        />
                    </div>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setPreset('ytd')}
                        className="btn btn-outline text-sm"
                    >
                        YTD
                    </button>
                    <button
                        onClick={() => setPreset('last3m')}
                        className="btn btn-outline text-sm"
                    >
                        3M
                    </button>
                    <button
                        onClick={() => setPreset('last6m')}
                        className="btn btn-outline text-sm"
                    >
                        6M
                    </button>
                    <button
                        onClick={() => setPreset('last12m')}
                        className="btn btn-outline text-sm"
                    >
                        12M
                    </button>
                </div>

                {/* Compare Toggle */}
                {showCompare && (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={compare}
                            onChange={(e) => setCompare(e.target.checked)}
                            className="w-4 h-4 rounded border-glass-border bg-glass-bg text-accent-gold focus:ring-accent-gold"
                        />
                        <span className="text-sm text-text-gray">Compare</span>
                    </label>
                )}

                {/* Apply Button */}
                <button onClick={handleApply} className="btn btn-primary">
                    Apply
                </button>
            </div>
        </div>
    )
}
