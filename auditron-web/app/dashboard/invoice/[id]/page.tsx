'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { JobStatus } from '@/components/JobStatus'
import { getInvoice, startInvoiceOcr, deleteInvoice } from '@/lib/api/invoice'
import type { Invoice } from '@/types/api'
import { motion } from 'framer-motion'

export default function InvoiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const invoiceId = params.id as string

    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [ocrJobId, setOcrJobId] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        fetchInvoice()
    }, [invoiceId])

    const fetchInvoice = async () => {
        try {
            setLoading(true)
            const data = await getInvoice(invoiceId)
            setInvoice(data)
            setError(null)
        } catch (err: any) {
            setError(err.error || 'Failed to load invoice')
        } finally {
            setLoading(false)
        }
    }

    const handleStartOCR = async () => {
        try {
            setProcessing(true)
            const result = await startInvoiceOcr(invoiceId)
            setOcrJobId(result.jobId || null)
            await fetchInvoice() // Refresh invoice data
        } catch (err: any) {
            alert(err.error || 'Failed to start OCR')
        } finally {
            setProcessing(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this invoice?')) return

        try {
            await deleteInvoice(invoiceId)
            router.push('/dashboard')
        } catch (err: any) {
            alert(err.error || 'Failed to delete invoice')
        }
    }

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

    if (error || !invoice) {
        return (
            <div className="min-h-screen">
                <Header />
                <div className="pt-32 container mx-auto px-6">
                    <div className="text-center py-20">
                        <h1 className="text-2xl font-semibold mb-4">Invoice Not Found</h1>
                        <p className="text-text-gray mb-6">{error}</p>
                        <button onClick={() => router.push('/dashboard')} className="btn btn-primary">
                            Back to Dashboard
                        </button>
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
                            <h1 className="text-3xl font-semibold mb-2">Invoice Details</h1>
                            <p className="text-text-gray">Invoice #{invoice.invoiceNumber}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleStartOCR}
                                disabled={processing || invoice.status === 'PROCESSING'}
                                className="btn btn-gold"
                            >
                                {processing ? 'Starting...' : 'Start OCR'}
                            </button>
                            <button onClick={handleDelete} className="btn btn-outline text-red-400 border-red-400">
                                Delete
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* File Preview */}
                        <div className="glass-card">
                            <h2 className="text-xl font-semibold mb-4">File Preview</h2>

                            {invoice.mimeType.startsWith('image/') ? (
                                <img
                                    src={`/api/files/${invoice.fileUrl}`}
                                    alt="Invoice"
                                    className="w-full rounded-lg"
                                />
                            ) : (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 mx-auto text-accent-gold mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-text-gray mb-4">{invoice.fileName}</p>
                                    <a
                                        href={`/api/files/${invoice.fileUrl}`}
                                        download
                                        className="btn btn-outline"
                                    >
                                        Download PDF
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Invoice Metadata */}
                        <div className="glass-card space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Invoice Information</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-text-gray mb-1">Status</label>
                                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${invoice.status === 'COMPLETED' ? 'bg-green-500 bg-opacity-20 text-green-400' :
                                                invoice.status === 'PROCESSING' ? 'bg-blue-500 bg-opacity-20 text-blue-400' :
                                                    invoice.status === 'FAILED' ? 'bg-red-500 bg-opacity-20 text-red-400' :
                                                        'bg-yellow-500 bg-opacity-20 text-yellow-400'
                                            }`}>
                                            {invoice.status}
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-text-gray mb-1">Vendor Name</label>
                                        <input
                                            type="text"
                                            value={invoice.vendorName || ''}
                                            className="input"
                                            readOnly
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-text-gray mb-1">Vendor GST</label>
                                        <input
                                            type="text"
                                            value={invoice.vendorGst || ''}
                                            className="input"
                                            readOnly
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-text-gray mb-1">Invoice Date</label>
                                            <input
                                                type="text"
                                                value={invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : ''}
                                                className="input"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-text-gray mb-1">Due Date</label>
                                            <input
                                                type="text"
                                                value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ''}
                                                className="input"
                                                readOnly
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-text-gray mb-1">Total Amount</label>
                                            <input
                                                type="text"
                                                value={invoice.totalAmount ? `₹${invoice.totalAmount.toLocaleString()}` : ''}
                                                className="input"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-text-gray mb-1">GST Amount</label>
                                            <input
                                                type="text"
                                                value={invoice.gstAmount ? `₹${invoice.gstAmount.toLocaleString()}` : ''}
                                                className="input"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* OCR Data */}
                            {invoice.ocrData && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">OCR Extracted Data</h3>
                                    <div className="bg-black bg-opacity-40 rounded-lg p-4 max-h-64 overflow-auto">
                                        <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                                            {JSON.stringify(invoice.ocrData, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Job Status */}
                    {ocrJobId && (
                        <JobStatus
                            jobId={ocrJobId}
                            onComplete={() => fetchInvoice()}
                        />
                    )}
                </motion.div>
            </div>
        </div>
    )
}
