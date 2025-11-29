'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import type { User } from '@/types/api'

interface AuthContextType {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Initialize auth state from localStorage
        const initAuth = async () => {
            try {
                const currentUser = apiClient.getCurrentUser()
                if (currentUser) {
                    setUser(currentUser)
                    setToken(localStorage.getItem('auth_token'))

                    // Verify token is still valid
                    try {
                        const freshUser = await apiClient.me()
                        setUser(freshUser)
                    } catch (error) {
                        // Token expired or invalid
                        apiClient.logout()
                        setUser(null)
                        setToken(null)
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error)
            } finally {
                setIsLoading(false)
            }
        }

        initAuth()
    }, [])

    const login = async (email: string, password: string) => {
        const response = await apiClient.login({ email, password })
        setUser(response.user as User)
        setToken(response.token)
    }

    const logout = () => {
        apiClient.logout()
        setUser(null)
        setToken(null)
        router.push('/')
    }

    const refreshUser = async () => {
        try {
            const freshUser = await apiClient.me()
            setUser(freshUser)
        } catch (error) {
            console.error('Failed to refresh user:', error)
            logout()
        }
    }

    return (
        <AuthContext.Provider
      value= {{
        user,
            token,
            isAuthenticated: !!user && !!token,
                isLoading,
                login,
                logout,
                refreshUser,
      }
}
    >
    { children }
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context
 * 
 * PRODUCTION NOTE:
 * For production, migrate to HttpOnly cookies:
 * 1. Backend sets cookie on login: reply.setCookie('auth_token', token, { httpOnly: true, secure: true })
 * 2. Remove localStorage usage
 * 3. Use credentials: 'include' in fetch calls
 * 4. Implement CSRF protection
 */
export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

/**
 * HOC to require authentication for a page
 * Usage: export default requireAuth(MyPage)
 */
export function requireAuth<P extends object>(
    Component: React.ComponentType<P>,
    options?: { roles?: Array<'ADMIN' | 'CA' | 'USER'> }
) {
    return function AuthenticatedComponent(props: P) {
        const { user, isLoading, isAuthenticated } = useAuth()
        const router = useRouter()

        useEffect(() => {
            if (!isLoading && !isAuthenticated) {
                router.push('/auth/login')
            }

            if (!isLoading && isAuthenticated && options?.roles) {
                if (user && !options.roles.includes(user.role)) {
                    router.push('/dashboard') // Redirect to dashboard if wrong role
                }
            }
        }, [isLoading, isAuthenticated, user, router])

        if (isLoading) {
            return (
                <div className= "min-h-screen flex items-center justify-center" >
                <div className="spinner" />
                    </div>
      )
        }

        if (!isAuthenticated) {
            return null
        }

        if (options?.roles && user && !options.roles.includes(user.role)) {
            return (
                <div className= "min-h-screen flex items-center justify-center" >
                <div className="text-center" >
                    <h1 className="text-2xl font-semibold mb-2" > Access Denied </h1>
                        < p className = "text-text-gray" > You don't have permission to access this page.</p>
                            </div>
                            </div>
      )
        }

        return <Component { ...props } />
  }
}
