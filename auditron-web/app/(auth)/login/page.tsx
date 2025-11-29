'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/apiClient'
import { motion } from 'framer-motion'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        try {
            setLoading(true)
            setError(null)

            await apiClient.login(data)

            router.push('/dashboard')
        } catch (err: any) {
            setError(err.error || 'Login failed. Please check your credentials.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div
                className="absolute inset-0 z-0"
                style={{
                    background: 'linear-gradient(180deg, rgba(13,11,10,1) 10%, rgba(20,12,16,1) 80%)',
                }}
            />

            <motion.div
                className="w-full max-w-md relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 group">
                        <img src="/logo.png" alt="AUDITRON" className="w-10 h-10" />
                        <span className="text-2xl font-bold tracking-tight group-hover:text-accent-gold transition-colors">
                            AUDITRON
                        </span>
                    </Link>
                </div>

                <div className="glass-card">
                    <h1 className="text-3xl font-semibold mb-2 text-center">Welcome Back</h1>
                    <p className="text-text-gray text-center mb-8">
                        Sign in to your account to continue
                    </p>

                    {error && (
                        <div
                            className="mb-6 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-400 text-sm"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2">
                                Email Address
                            </label>
                            <input
                                {...register('email')}
                                type="email"
                                id="email"
                                className="input"
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                            {errors.email && (
                                <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2">
                                Password
                            </label>
                            <input
                                {...register('password')}
                                type="password"
                                id="password"
                                className="input"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                            {errors.password && (
                                <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full btn btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-text-gray">
                            Don't have an account?{' '}
                            <Link href="/register" className="text-accent-gold hover:underline">
                                Create one now
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
