'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { AgentJob } from '@/types/api'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'

interface JobStatusProps {
    jobId: string
    onComplete?: (result: any) => void
    onError?: (error: string) => void
}

export function JobStatus({ jobId, onComplete, onError }: JobStatusProps) {
    const [job, setJob] = useState<AgentJob | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [useSSE, setUseSSE] = useState(true)

    const fetchJobStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('auth_token')
            const response = await fetch(`${API_BASE}/api/agent/status/${jobId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })

            if (!response.ok) {
                throw new Error('Failed to fetch job status')
            }

            const data = await response.json()
            setJob(data)
            setLoading(false)

            if (data.status === 'COMPLETED') {
                if (onComplete) onComplete(data.output)
            } else if (data.status === 'FAILED') {
                setError(data.error || 'Job failed')
                if (onError) onError(data.error || 'Job failed')
            }

            return data
        } catch (err: any) {
            console.error('Job status fetch error:', err)
            setError(err.message)
            setLoading(false)
            return null
        }
    }, [jobId, onComplete, onError])

    useEffect(() => {
        // Try SSE first, fallback to polling
        // NOTE: EventSource doesn't support custom headers, so if backend requires auth,
        // we must use polling or implement server-side proxy

        if (useSSE) {
            try {
                // TODO: If backend implements SSE at /api/agent/status/{jobId}/stream
                // const eventSource = new EventSource(`${API_BASE}/api/agent/status/${jobId}/stream`)
                // eventSource.onmessage = (event) => {
                //   const data = JSON.parse(event.data)
                //   setJob(data)
                //   if (data.status === 'COMPLETED' || data.status === 'FAILED') {
                //     eventSource.close()
                //   }
                // }
                // eventSource.onerror = () => {
                //   eventSource.close()
                //   setUseSSE(false) // Fallback to polling
                // }
                // return () => eventSource.close()

                // For now, use polling since SSE requires auth headers
                setUseSSE(false)
            } catch (err) {
                setUseSSE(false)
            }
        }

        // Polling fallback
        const poll = async () => {
            const data = await fetchJobStatus()

            if (data && data.status !== 'COMPLETED' && data.status !== 'FAILED') {
                setTimeout(poll, 2000) // Poll every 2 seconds
            }
        }

        poll()
    }, [jobId, useSSE, fetchJobStatus])

    if (loading && !job) {
        return (
            <div className="glass-card">
                <div className="flex items-center justify-center py-8">
                    <div className="spinner" />
                    <span className="ml-3 text-text-gray">Loading job status...</span>
                </div>
            </div>
        )
    }

    if (error && !job) {
        return (
            <div className="glass-card">
                <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-400">
                    {error}
                </div>
            </div>
        )
    }

    if (!job) return null

    return (
        <div className="glass-card space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Job Status</h3>
                <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${job.status === 'COMPLETED'
                            ? 'bg-green-500 bg-opacity-20 text-green-400'
                            : job.status === 'FAILED'
                                ? 'bg-red-500 bg-opacity-20 text-red-400'
                                : job.status === 'RUNNING'
                                    ? 'bg-blue-500 bg-opacity-20 text-blue-400'
                                    : 'bg-yellow-500 bg-opacity-20 text-yellow-400'
                        }`}
                >
                    {job.status}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-text-gray">Progress</span>
                    <span className="text-accent-gold font-medium">{job.progress}%</span>
                </div>
                <div className="h-2 bg-glass-bg rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-accent-gold"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {/* Job Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-text-gray mb-1">Job ID</p>
                    <p className="font-mono text-xs">{job.id}</p>
                </div>
                <div>
                    <p className="text-text-gray mb-1">Type</p>
                    <p className="capitalize">{job.type.toLowerCase()}</p>
                </div>
                <div>
                    <p className="text-text-gray mb-1">Started</p>
                    <p>{job.startedAt ? new Date(job.startedAt).toLocaleString() : 'Not started'}</p>
                </div>
                <div>
                    <p className="text-text-gray mb-1">Completed</p>
                    <p>{job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}</p>
                </div>
            </div>

            {/* Logs */}
            {job.logs && job.logs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-text-gray">Logs</p>
                    <div className="bg-black bg-opacity-40 rounded-lg p-4 max-h-48 overflow-y-auto space-y-1">
                        {job.logs.map((log: any, index: number) => (
                            <div key={index} className="text-xs font-mono text-text-gray">
                                <span className="text-accent-gold">[{log.timestamp || index}]</span>{' '}
                                {typeof log === 'string' ? log : log.message || JSON.stringify(log)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Output */}
            {job.status === 'COMPLETED' && job.output && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-text-gray">Result</p>
                    <div className="bg-black bg-opacity-40 rounded-lg p-4 max-h-96 overflow-auto">
                        <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                            {JSON.stringify(job.output, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {/* Error */}
            {job.status === 'FAILED' && job.error && (
                <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-400 text-sm">
                    {job.error}
                </div>
            )}
        </div>
    )
}
