import './globals.css'
import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { Providers } from './providers'

const poppins = Poppins({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'AUDITRON - AI-Driven Accounting Automation',
    description: 'Revolutionize your accounting with AI-powered automation, OCR, reconciliation, and compliance tools.',
    keywords: ['accounting', 'AI', 'automation', 'fintech', 'OCR', 'reconciliation'],
    authors: [{ name: 'AUDITRON Team' }],
    openGraph: {
        title: 'AUDITRON - AI-Driven Accounting Automation',
        description: 'Automate accounting from data upload to compliant reports in seconds',
        type: 'website',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={poppins.className}>
            <body className="min-h-screen">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
