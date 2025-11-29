'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface FeatureCardProps {
    title: string
    description: string
    features?: string[]
    pills?: string[]
    metric?: {
        label: string
        value: string
    }
    icon?: ReactNode
    delay?: number
}

export function FeatureCard({
    title,
    description,
    features,
    pills,
    metric,
    icon,
    delay = 0,
}: FeatureCardProps) {
    return (
        <motion.article
            className="glass-card group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay }}
        >
            {icon && (
                <div className="text-accent-gold mb-4 text-3xl" aria-hidden="true">
                    {icon}
                </div>
            )}

            <h3 className="text-2xl font-semibold mb-3 group-hover:text-accent-gold transition-colors">
                {title}
            </h3>

            <p className="text-text-gray text-sm mb-4 leading-relaxed">
                {description}
            </p>

            {features && features.length > 0 && (
                <ul className="space-y-2 mb-4">
                    {features.map((feature, index) => (
                        <li
                            key={index}
                            className="flex items-start gap-2 text-text-gray text-sm"
                        >
                            <span className="text-accent-gold mt-1">•</span>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            )}

            {pills && pills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {pills.map((pill, index) => (
                        <button
                            key={index}
                            className="px-4 py-2 rounded-full border border-glass-border bg-transparent text-text-gray text-sm hover:border-accent-gold hover:text-accent-gold transition-colors"
                            aria-label={pill}
                        >
                            {pill}
                        </button>
                    ))}
                </div>
            )}

            {metric && (
                <div className="mt-4 p-4 bg-black bg-opacity-35 rounded-lg text-center border border-glass-border">
                    <p className="text-text-gray text-sm mb-1">{metric.label}</p>
                    <p className="text-2xl font-semibold text-accent-gold">{metric.value}</p>
                </div>
            )}
        </motion.article>
    )
}
