'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { motion } from 'framer-motion'

export default function BillingPage() {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<any>(null)
    const [plans, setPlans] = useState<any[]>([])

    useEffect(() => {
        fetchBillingStatus()
        fetchPlans()
    }, [])

    const fetchBillingStatus = async () => {
        try {
            const response = await fetch(`/api/billing/status/${user?.orgId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setStatus(data)
            }
        } catch (error) {
            console.error('Failed to fetch billing status:', error)
        }
    }

    const fetchPlans = async () => {
        try {
            const response = await fetch('/api/billing/plans')
            if (response.ok) {
                const data = await response.json()
                setPlans(data.plans)
            }
        } catch (error) {
            console.error('Failed to fetch plans:', error)
        }
    }

    const handleUpgrade = async (planId: string) => {
        setLoading(true)

        try {
            const response = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({ planId }),
            })

            if (response.ok) {
                const data = await response.json()
                window.location.href = data.url
            } else {
                throw new Error('Failed to create checkout session')
            }
        } catch (error) {
            addToast('Failed to start checkout', 'error')
            setLoading(false)
        }
    }

    const handleManageBilling = async () => {
        setLoading(true)

        try {
            const response = await fetch('/api/billing/portal', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                window.location.href = data.url
            } else {
                throw new Error('Failed to create portal session')
            }
        } catch (error) {
            addToast('Failed to open billing portal', 'error')
        } finally {
            setLoading(false)
        }
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
                    <h1 className="text-3xl font-semibold">Billing & Subscription</h1>

                    {/* Current Plan */}
                    {status && (
                        <div className="glass-card">
                            <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-accent-gold capitalize">
                                        {status.plan}
                                    </p>
                                    <p className="text-text-gray mt-1">
                                        Status: <span className="capitalize">{status.status}</span>
                                    </p>
                                    {status.currentPeriodEnd && (
                                        <p className="text-sm text-text-gray mt-1">
                                            Renews on {new Date(status.currentPeriodEnd).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleManageBilling}
                                    disabled={loading}
                                    className="btn btn-outline"
                                >
                                    {loading ? 'Loading...' : 'Manage Billing'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Available Plans */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`glass-card ${plan.popular ? 'border-2 border-accent-gold' : ''}`}
                            >
                                {plan.popular && (
                                    <div className="bg-accent-gold text-bg-dark px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                                        Most Popular
                                    </div>
                                )}

                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

                                {plan.price ? (
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold">₹{plan.price}</span>
                                        <span className="text-text-gray">/{plan.interval}</span>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <span className="text-2xl font-bold">Custom Pricing</span>
                                    </div>
                                )}

                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <svg
                                                className="w-5 h-5 text-accent-gold mt-0.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {plan.contactSales ? (
                                    <a href="mailto:sales@auditron.ai" className="btn btn-outline w-full">
                                        Contact Sales
                                    </a>
                                ) : (
                                    <button
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={loading || status?.plan === plan.id}
                                        className={`btn w-full ${plan.popular ? 'btn-gold' : 'btn-outline'
                                            }`}
                                    >
                                        {status?.plan === plan.id ? 'Current Plan' : 'Upgrade'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
