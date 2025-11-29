'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/apiClient'
import { motion } from 'framer-motion'

const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    organizationName: z.string().min(1, 'Organization name is required'),
    organizationEmail: z.string().email('Invalid organization email'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = async (data: RegisterFormData) => {
        try {
            setLoading(true)
            setError(null)

            const { confirmPassword, ...registerData } = data

            await apiClient.register(registerData)

            router.push('/dashboard')
        } catch (err: any) {
            setError(err.error || 'Registration failed. Please try again.')
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
                className="w-full max-w-2xl relative z-10"
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
                    <h1 className="text-3xl font-semibold mb-2 text-center">Create Account</h1>
                    <p className="text-text-gray text-center mb-8">
                        Start automating your accounting today
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
                            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                                        First Name
                                    </label>
                                    <input
                                        {...register('firstName')}
                                        type="text"
                                        id="firstName"
                                        className="input"
                                        placeholder="John"
                                    />
                                    {errors.firstName && (
                                        <p className="mt-2 text-sm text-red-400">{errors.firstName.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        {...register('lastName')}
                                        type="text"
                                        id="lastName"
                                        className="input"
                                        placeholder="Doe"
                                    />
                                    {errors.lastName && (
                                        <p className="mt-2 text-sm text-red-400">{errors.lastName.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>

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
                            />
                            {errors.email && (
                                <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                />
                                {errors.password && (
                                    <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    {...register('confirmPassword')}
                                    type="password"
                                    id="confirmPassword"
                                    className="input"
                                    placeholder="••••••••"
                                />
                                {errors.confirmPassword && (
                                    <p className="mt-2 text-sm text-red-400">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-glass-border">
                            <h3 className="text-lg font-semibold mb-4">Organization Information</h3>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="organizationName" className="block text-sm font-medium mb-2">
                                        Organization Name
                                    </label>
                                    <input
                                        {...register('organizationName')}
                                        type="text"
                                        id="organizationName"
                                        className="input"
                                        placeholder="Acme Corp"
                                    />
                                    {errors.organizationName && (
                                        <p className="mt-2 text-sm text-red-400">{errors.organizationName.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="organizationEmail" className="block text-sm font-medium mb-2">
                                        Organization Email
                                    </label>
                                    <input
                                        {...register('organizationEmail')}
                                        type="email"
                                        id="organizationEmail"
                                        className="input"
                                        placeholder="contact@acme.com"
                                    />
                                    {errors.organizationEmail && (
                                        <p className="mt-2 text-sm text-red-400">{errors.organizationEmail.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full btn btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-text-gray">
                            Already have an account?{' '}
                            <Link href="/login" className="text-accent-gold hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
