'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import type { HomeStats } from '@/types/api'

export function StatsRow() {
    const [stats, setStats] = useState<HomeStats>({
        updated: 17,
        status: '93%',
        transactionsProcessed: 8000,
    })

    useEffect(() => {
        // Fetch stats from API
        apiClient.getHomeStats().then(setStats).catch(console.error)
    }, [])

    const statItems = [
        { label: 'Updated', value: stats.updated.toString() },
        { label: 'Status', value: stats.status },
        { label: 'Transactions Processed', value: stats.transactionsProcessed.toLocaleString() },
    ]

    return (
        <section className="py-16">
            <div className="container mx-auto px-6">
                <div className="glass-card">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {statItems.map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                className="text-center py-8"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <div className="text-4xl md:text-5xl font-bold text-text-white mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-text-gray uppercase tracking-wider">
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
