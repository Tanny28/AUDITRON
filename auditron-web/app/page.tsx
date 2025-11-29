import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { FeatureCard } from '@/components/FeatureCard'
import { StatsRow } from '@/components/StatsRow'
import Link from 'next/link'

export default function HomePage() {
    return (
        <main className="min-h-screen">
            <Header />

            {/* Hero Section */}
            <Hero
                title="Automate Accounting. Compliant in Seconds."
                subtitle="Audit-ready reporting & AI-powered financial workflows."
                ctaText="Join now"
                ctaLink="#features"
            />

            {/* Features Section */}
            <section id="features" className="py-20 relative z-10">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            title="AI Assistant for Accounting"
                            description="Insert transactions, perform powerful reconciliation and leverage AI—without leaving your dashboard."
                            features={[
                                'Transaction Categorization',
                                'Invoice OCR & Processing',
                                'Regulatory Compliance Tools',
                            ]}
                            delay={0}
                        />

                        <FeatureCard
                            title="AI Report Generation"
                            description="One-click professional-grade financial reports with compliance checks."
                            pills={['P&L', 'Balance Sheet', 'Tax Reports']}
                            delay={0.1}
                        />

                        <FeatureCard
                            title="Performance Analytics"
                            description="Compliance monitoring and financial metrics that surface savings and trends."
                            metric={{
                                label: 'Monthly Savings',
                                value: '₹27,000',
                            }}
                            delay={0.2}
                        />
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <StatsRow />

            {/* Announcement Banner */}
            <section className="py-16">
                <div className="container mx-auto px-6">
                    <div className="glass-card">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-2xl font-semibold mb-2">Announcement</h3>
                                <p className="text-text-gray">
                                    Agentic AI Accounting Bot launching soon—free trial for beta users!
                                </p>
                            </div>
                            <Link
                                href="/pricing"
                                className="btn btn-outline whitespace-nowrap"
                                aria-label="Learn more about pricing"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-glass-border">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex gap-6">
                            <Link
                                href="/privacy"
                                className="text-sm text-text-gray hover:text-text-white transition-colors"
                            >
                                Privacy Policy
                            </Link>
                            <Link
                                href="/terms"
                                className="text-sm text-text-gray hover:text-text-white transition-colors"
                            >
                                Terms of Service
                            </Link>
                        </div>
                        <div className="text-sm text-text-gray">
                            Contact: <a href="mailto:support@auditron.ai" className="hover:text-accent-gold transition-colors">support@auditron.ai</a>
                        </div>
                        <div className="text-sm text-text-gray">
                            © 2025 AUDITRON. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    )
}
