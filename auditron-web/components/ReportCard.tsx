'use client'

import { motion } from 'framer-motion'
import { Sparkline } from './Sparkline'

interface ReportCardProps {
    title: string
    value: string | number
    delta?: number
    sparklineData?: number[]
    icon?: React.ReactNode
    delay?: number
}

export function ReportCard({
    title,
    value,
    delta,
    sparklineData,
    icon,
    delay = 0,
}: ReportCardProps) {
    const formatValue = (val: string | number): string => {
        if (typeof val === 'number') {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
            }).format(val)
        }
        return val
    }

    const formatDelta = (d: number): string => {
        const sign = d >= 0 ? '+' : ''
        return `${sign}${d.toFixed(1)}%`
    }

    return (
        <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <p className="text-sm text-text-gray mb-1">{title}</p>
                    <p className="text-3xl font-bold">{formatValue(value)}</p>
                </div>
                {icon && (
                    <div className="text-accent-gold text-2xl" aria-hidden="true">
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                {delta !== undefined && (
                    <span
                        className={`text-sm font-medium ${delta >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                    >
                        {formatDelta(delta)}
                    </span>
                )}

                {sparklineData && sparklineData.length > 0 && (
                    <div className="flex-1 ml-4">
                        <Sparkline data={sparklineData} color={delta && delta >= 0 ? '#4ade80' : '#f87171'} />
                    </div>
                )}
            </div>
        </motion.div>
    )
}
