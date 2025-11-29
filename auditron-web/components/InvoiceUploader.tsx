'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadInvoice, startInvoiceOcr } from '@/lib/api/invoice'
import { motion, AnimatePresence } from 'framer-motion'

interface InvoiceUploaderProps {
    onSuccess?: (data: { invoiceId: string; jobId?: string }) => void
    onError?: (error: Error) => void
}

export function InvoiceUploader({ onSuccess, onError }: InvoiceUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<{ invoiceId: string; jobId?: string } | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const retryCountRef = useRef(0)

    const handleUpload = useCallback(
        async (file: File) => {
            setUploading(true)
            setProgress(0)
            setError(null)
            setSuccess(null)
            setFileName(file.name)

            // Generate preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onloadend = () => {
                    setPreview(reader.result as string)
                }
                reader.readAsDataURL(file)
            } else {
                setPreview(null)
            }

            try {
                const result = await uploadInvoice(file, (p) => setProgress(p))

                // Auto-start OCR if jobId not returned
                let jobId = result.jobId
                if (!jobId) {
                    try {
                        const ocrResult = await startInvoiceOcr(result.invoiceId)
                        jobId = ocrResult.jobId
                    } catch (ocrError) {
                        console.error('Failed to start OCR:', ocrError)
                    }
                }

                setSuccess({ ...result, jobId })
                setUploading(false)
                retryCountRef.current = 0

                if (onSuccess) {
                    onSuccess({ ...result, jobId })
                }
            } catch (err: any) {
                console.error('Upload error:', err)

                // Retry logic for network errors
                if (
                    retryCountRef.current < 3 &&
                    (!err.statusCode || err.statusCode >= 500)
                ) {
                    retryCountRef.current++
                    setError(
                        `Upload failed. Retrying (${retryCountRef.current}/3)...`
                    )

                    // Exponential backoff
                    setTimeout(() => {
                        handleUpload(file)
                    }, 1000 * Math.pow(2, retryCountRef.current - 1))
                } else {
                    setError(err.error || err.message || 'Upload failed')
                    setUploading(false)
                    retryCountRef.current = 0

                    if (onError) {
                        onError(err)
                    }
                }
            }
        },
        [onSuccess, onError]
    )

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                handleUpload(acceptedFiles[0])
            }
        },
        [handleUpload]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg'],
        },
        maxFiles: 1,
        disabled: uploading,
    })

    const copyJobLink = () => {
        if (success?.jobId) {
            const link = `${window.location.origin}/dashboard/job/${success.jobId}`
            navigator.clipboard.writeText(link)
            alert('Job link copied to clipboard!')
        }
    }

    return (
        <div className="space-y-6">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-300
          ${isDragActive
                        ? 'border-accent-gold bg-accent-gold bg-opacity-10'
                        : 'border-glass-border hover:border-accent-gold'
                    }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
                aria-label="Upload invoice file"
            >
                <input {...getInputProps()} />

                <div className="space-y-4">
                    {preview ? (
                        <img
                            src={preview}
                            alt="Invoice preview"
                            className="max-w-xs mx-auto rounded-lg"
                        />
                    ) : (
                        <svg
                            className="w-16 h-16 mx-auto text-accent-gold"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                    )}

                    {fileName && (
                        <p className="text-sm text-text-gray font-medium">{fileName}</p>
                    )}

                    {isDragActive ? (
                        <p className="text-accent-gold font-medium">Drop the file here...</p>
                    ) : (
                        <div>
                            <p className="text-text-white font-medium mb-2">
                                Drag & drop an invoice here, or click to select
                            </p>
                            <p className="text-sm text-text-gray">
                                Supports PDF, PNG, JPG (max 10MB)
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <AnimatePresence>
                {uploading && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                    >
                        <div className="flex justify-between text-sm">
                            <span className="text-text-gray">Uploading...</span>
                            <span className="text-accent-gold font-medium">{progress}%</span>
                        </div>
                        <div className="h-2 bg-glass-bg rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-accent-gold"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg"
                        role="alert"
                    >
                        <div className="flex items-start gap-3">
                            <svg
                                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div className="flex-1">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-300"
                                aria-label="Dismiss error"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg"
                        role="status"
                    >
                        <div className="flex items-start gap-3">
                            <svg
                                className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div className="flex-1 space-y-2">
                                <p className="text-green-400 font-medium">Upload successful!</p>
                                <div className="text-sm text-text-gray space-y-1">
                                    <p>
                                        Invoice ID:{' '}
                                        <code className="text-accent-gold">{success.invoiceId}</code>
                                    </p>
                                    {success.jobId && (
                                        <p>
                                            Job ID:{' '}
                                            <code className="text-accent-gold">{success.jobId}</code>
                                        </p>
                                    )}
                                </div>
                                {success.jobId && (
                                    <button
                                        onClick={copyJobLink}
                                        className="btn btn-outline text-sm mt-2"
                                    >
                                        Copy Job Link
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
