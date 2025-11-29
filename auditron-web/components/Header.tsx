'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import type { User } from '@/types/api'

export function Header() {
    const pathname = usePathname()
    const [user, setUser] = useState<User | null>(null)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        // Get user from localStorage on mount
        const currentUser = apiClient.getCurrentUser()
        setUser(currentUser)

        // Handle scroll effect
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLogout = () => {
        apiClient.logout()
        setUser(null)
        window.location.href = '/'
    }

    const isActive = (path: string) => pathname === path

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-bg-dark bg-opacity-80 backdrop-blur-lg border-b border-glass-border py-4'
                : 'bg-transparent py-6'
                }`}
        >
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <img src="/logo.png" alt="AUDITRON" className="w-8 h-8" />
                        <span className="text-xl font-bold tracking-tight group-hover:text-accent-gold transition-colors">
                            AUDITRON
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link
                            href="/"
                            className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-accent-gold' : 'text-text-gray hover:text-text-white'
                                }`}
                        >
                            Home
                        </Link>
                        <Link
                            href="/pricing"
                            className={`text-sm font-medium transition-colors ${isActive('/pricing') ? 'text-accent-gold' : 'text-text-gray hover:text-text-white'
                                }`}
                        >
                            Pricing
                        </Link>
                        {user && (
                            <>
                                <Link
                                    href="/dashboard"
                                    className={`text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-accent-gold' : 'text-text-gray hover:text-text-white'
                                        }`}
                                >
                                    Dashboard
                                </Link>
                                {user.role === 'ADMIN' && (
                                    <Link
                                        href="/admin"
                                        className={`text-sm font-medium transition-colors ${isActive('/admin') ? 'text-accent-gold' : 'text-text-gray hover:text-text-white'
                                            }`}
                                    >
                                        Admin
                                    </Link>
                                )}
                            </>
                        )}
                    </div>

                    {/* Auth Actions */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <div className="hidden md:flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-text-white">
                                            {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-xs text-text-gray capitalize">{user.role.toLowerCase()}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-accent-gold rounded-full flex items-center justify-center">
                                        <span className="text-bg-dark font-semibold text-sm">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="btn btn-outline text-sm"
                                    aria-label="Logout"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-sm font-medium text-text-gray hover:text-text-white transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/register"
                                    className="btn btn-primary text-sm"
                                    aria-label="Create Account"
                                >
                                    Open Account
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
