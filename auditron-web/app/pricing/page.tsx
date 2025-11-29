'use client'

import { Header } from '@/components/Header'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { apiClient } from '@/lib/apiClient'

interface PricingTier {
    name: string
    price: string
    period: string
    description: string
    features: string[]
    highlighted?: boolean
    priceId: string
    ctaText: string
}

const pricingTiers: PricingTier[] = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'Perfect for getting started',
        features: [
            'Up to 100 transactions/month',
            'Basic OCR processing',
            'Standard reports (P&L, Balance Sheet)',
            'Email support',
            '1 user',
        ],
        priceId: 'price_free',
        ctaText: 'Get Started Free',
    },
    {
        name: 'Professional',
        price: '$59',
        period: 'per month',
        description: 'For growing businesses',
        features: [
            'Unlimited transactions',
            'Advanced AI categorization',
            'All report types (P&L, BS, GST, Tax)',
            'Automated reconciliation',
            'Priority support',
            'Up to 5 users',
            'API access',
        ],
        highlighted: true,
        priceId: 'price_professional',
        ctaText: 'Upgrade Now',
    },
    {
        name: 'Enterprise',
        price: '$299',
        period: 'per month',
        description: 'For large organizations',
        features: [
            'Everything in Professional',
            'Custom AI workflows',
            'Dedicated account manager',
            'SLA guarantee',
            'Unlimited users',
            'Custom integrations',
            'On-premise deployment option',
            'Advanced security & compliance',
        ],
        priceId: 'price_enterprise',
        ctaText: 'Request Demo',
    },
]

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null)

    const handleSubscribe = async (priceId: string) => {
        if (priceId === 'price_free') {
            // Redirect to signup for free tier
            window.location.href = '/register'
            return
        }

        if (priceId === 'price_enterprise') {
            // Redirect to contact form for enterprise
            window.location.href = 'mailto:sales@auditron.ai?subject=Enterprise Demo Request'
            return
        }

        try {
            setLoading(priceId)
            const { url } = await apiClient.createCheckoutSession(priceId)
            window.location.href = url
        } catch (error) {
            console.error('Failed to create checkout session:', error)
            alert('Failed to start checkout. Please try again or contact support.')
        } finally {
            setLoading(null)
        }
    }

    return (
        <main className="min-h-screen">
            <Header />

            <div className="pt-32 pb-20">
                <div className="container mx-auto px-6">
                    {/* Header */}
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-light mb-6">
                            Choose Your Plan
                        </h1>
                        <p className="text-xl text-text-gray max-w-2xl mx-auto">
                            Start free and scale as you grow. All plans include core AI features.
                        </p>
                    </motion.div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        {pricingTiers.map((tier, index) => (
                            <motion.div
                                key={tier.name}
                                className={`glass-card relative ${tier.highlighted
                                    ? 'border-2 border-accent-gold shadow-2xl transform md:scale-105'
                                    : ''
                                    }`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                            >
                                {tier.highlighted && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-accent-gold text-bg-dark px-4 py-1 rounded-full text-sm font-semibold">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-semibold mb-2">{tier.name}</h2>
                                    <p className="text-text-gray text-sm mb-4">{tier.description}</p>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-5xl font-bold">{tier.price}</span>
                                        <span className="text-text-gray">/ {tier.period}</span>
                                    </div>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <svg
                                                className="w-5 h-5 text-accent-gold flex-shrink-0 mt-0.5"
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
                                            <span className="text-text-gray text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSubscribe(tier.priceId)}
                                    disabled={loading === tier.priceId}
                                    className={`w-full ${tier.highlighted ? 'btn btn-gold' : 'btn btn-outline'
                                        } ${loading === tier.priceId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    aria-label={`${tier.ctaText} for ${tier.name} plan`}
                                >
                                    {loading === tier.priceId ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="spinner" />
                                            Loading...
                                        </span>
                                    ) : (
                                        tier.ctaText
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>

                    {/* FAQ or Additional Info */}
                    <motion.div
                        className="mt-20 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <p className="text-text-gray">
                            Need a custom plan?{' '}
                            <a
                                href="mailto:sales@auditron.ai"
                                className="text-accent-gold hover:underline"
                            >
                                Contact our sales team
                            </a>
                        </p>
                    </motion.div>
                </div>
            </div>
        </main>
    )
}
