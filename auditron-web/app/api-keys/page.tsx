'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { motion } from 'framer-motion'

export default function ApiKeysPage() {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [keys, setKeys] = useState<any[]>([])
    const [newKey, setNewKey] = useState<string | null>(null)
    const [showNewKey, setShowNewKey] = useState(false)

    useEffect(() => {
        fetchKeys()
    }, [])

    const fetchKeys = async () => {
        try {
            const response = await fetch('/api/api-keys/list', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setKeys(data.keys)
            }
        } catch (error) {
            console.error('Failed to fetch API keys:', error)
        }
    }

    const handleGenerate = async () => {
        setLoading(true)

        try {
            const response = await fetch('/api/api-keys/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({ name: 'API Key' }),
            })

            if (response.ok) {
                const data = await response.json()
                setNewKey(data.apiKey)
                setShowNewKey(true)
                addToast('API key generated successfully', 'success')
                fetchKeys()
            } else {
                const data = await response.json()
                throw new Error(data.error)
            }
        } catch (error: any) {
            addToast(error.message || 'Failed to generate API key', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleRotate = async () => {
        if (!confirm('This will disable your current API key. Continue?')) return

        setLoading(true)

        try {
            const response = await fetch('/api/api-keys/rotate', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setNewKey(data.apiKey)
                setShowNewKey(true)
                addToast('API key rotated successfully', 'success')
                fetchKeys()
            } else {
                throw new Error('Failed to rotate API key')
            }
        } catch (error) {
            addToast('Failed to rotate API key', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDisable = async () => {
        if (!confirm('This will disable your current API key. Continue?')) return

        setLoading(true)

        try {
            const response = await fetch('/api/api-keys/disable', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            if (response.ok) {
                addToast('API key disabled successfully', 'success')
                fetchKeys()
            } else {
                throw new Error('Failed to disable API key')
            }
        } catch (error) {
            addToast('Failed to disable API key', 'error')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        addToast('Copied to clipboard', 'success')
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
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-semibold">API Keys</h1>
                        <div className="flex gap-3">
                            <button onClick={handleRotate} disabled={loading} className="btn btn-outline">
                                Rotate Key
                            </button>
                            <button onClick={handleGenerate} disabled={loading} className="btn btn-gold">
                                {loading ? 'Generating...' : 'Generate New Key'}
                            </button>
                        </div>
                    </div>

                    {/* New Key Display */}
                    {showNewKey && newKey && (
                        <div className="glass-card bg-accent-gold bg-opacity-10 border-accent-gold">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold mb-2 text-accent-gold">
                                        ⚠️ Save Your API Key
                                    </h3>
                                    <p className="text-sm text-text-gray mb-4">
                                        This is the only time you'll see this key. Store it securely.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-3 bg-bg-dark rounded font-mono text-sm">
                                            {newKey}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(newKey)}
                                            className="btn btn-outline"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowNewKey(false)}
                                    className="text-text-gray hover:text-text-white"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}

                    {/* API Keys List */}
                    <div className="glass-card">
                        <h2 className="text-xl font-semibold mb-6">Your API Keys</h2>

                        {keys.length === 0 ? (
                            <p className="text-text-gray text-center py-8">
                                No API keys yet. Generate one to get started.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {keys.map((key) => (
                                    <div
                                        key={key.id}
                                        className="flex items-center justify-between p-4 bg-glass-bg rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <code className="font-mono text-sm">{key.maskedKey}</code>
                                                {key.active ? (
                                                    <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-400 text-xs rounded">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-red-500 bg-opacity-20 text-red-400 text-xs rounded">
                                                        Disabled
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-4 mt-2 text-sm text-text-gray">
                                                <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                                {key.lastUsedAt && (
                                                    <span>
                                                        Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {key.active && (
                                            <button
                                                onClick={handleDisable}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                Disable
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Usage Instructions */}
                    <div className="glass-card">
                        <h2 className="text-xl font-semibold mb-4">Usage Instructions</h2>
                        <p className="text-text-gray mb-4">
                            Include your API key in the request header:
                        </p>
                        <pre className="p-4 bg-bg-dark rounded overflow-x-auto">
                            <code className="text-sm">
                                {`curl -X POST https://api.auditron.ai/v1/invoices \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"data": "..."}'`}
                            </code>
                        </pre>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
