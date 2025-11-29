'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { motion } from 'framer-motion'

export default function SettingsPage() {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [activeTab, setActiveTab] = useState('profile')
    const [loading, setLoading] = useState(false)

    // Profile state
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        timezone: 'Asia/Kolkata',
    })

    // Notification state
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        jobAlerts: true,
        anomalyAlerts: true,
        weeklyReports: false,
    })

    // Password state
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setProfile(data.profile)
                setNotifications(data.notifications)
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/settings/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify(profile),
            })

            if (response.ok) {
                addToast('Profile updated successfully', 'success')
            } else {
                throw new Error('Failed to update profile')
            }
        } catch (error) {
            addToast('Failed to update profile', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleNotificationUpdate = async () => {
        setLoading(true)

        try {
            const response = await fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify(notifications),
            })

            if (response.ok) {
                addToast('Notification preferences updated', 'success')
            } else {
                throw new Error('Failed to update notifications')
            }
        } catch (error) {
            addToast('Failed to update notifications', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()

        if (passwords.newPassword !== passwords.confirmPassword) {
            addToast('Passwords do not match', 'error')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/settings/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword,
                }),
            })

            if (response.ok) {
                addToast('Password changed successfully', 'success')
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
            } else {
                const data = await response.json()
                throw new Error(data.error || 'Failed to change password')
            }
        } catch (error: any) {
            addToast(error.message, 'error')
        } finally {
            setLoading(false)
        }
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
                    <h1 className="text-3xl font-semibold">Settings</h1>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-glass-border">
                        {['profile', 'notifications', 'password'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 font-medium capitalize transition-colors ${activeTab === tab
                                        ? 'text-accent-gold border-b-2 border-accent-gold'
                                        : 'text-text-gray hover:text-text-white'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="glass-card">
                            <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">First Name</label>
                                        <input
                                            type="text"
                                            value={profile.firstName}
                                            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Last Name</label>
                                        <input
                                            type="text"
                                            value={profile.lastName}
                                            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Timezone</label>
                                    <select
                                        value={profile.timezone}
                                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                                        className="input"
                                    >
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="America/New_York">America/New_York (EST)</option>
                                        <option value="Europe/London">Europe/London (GMT)</option>
                                    </select>
                                </div>

                                <button type="submit" disabled={loading} className="btn btn-gold">
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="glass-card">
                            <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
                            <div className="space-y-4">
                                {Object.entries(notifications).map(([key, value]) => (
                                    <label key={key} className="flex items-center justify-between">
                                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            onChange={(e) =>
                                                setNotifications({ ...notifications, [key]: e.target.checked })
                                            }
                                            className="w-5 h-5"
                                        />
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={handleNotificationUpdate}
                                disabled={loading}
                                className="btn btn-gold mt-6"
                            >
                                {loading ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </div>
                    )}

                    {/* Password Tab */}
                    {activeTab === 'password' && (
                        <div className="glass-card">
                            <h2 className="text-xl font-semibold mb-6">Change Password</h2>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        value={passwords.currentPassword}
                                        onChange={(e) =>
                                            setPasswords({ ...passwords, currentPassword: e.target.value })
                                        }
                                        className="input"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                        className="input"
                                        required
                                        minLength={8}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) =>
                                            setPasswords({ ...passwords, confirmPassword: e.target.value })
                                        }
                                        className="input"
                                        required
                                    />
                                </div>

                                <button type="submit" disabled={loading} className="btn btn-gold">
                                    {loading ? 'Changing...' : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
