'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { motion } from 'framer-motion'

export default function OrganizationPage() {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [members, setMembers] = useState<any[]>([])
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState('ACCOUNTANT')

    useEffect(() => {
        fetchMembers()
    }, [])

    const fetchMembers = async () => {
        try {
            const response = await fetch('/api/org/members', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setMembers(data.members)
            }
        } catch (error) {
            console.error('Failed to fetch members:', error)
        }
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/org/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            })

            if (response.ok) {
                addToast('Invite sent successfully', 'success')
                setInviteEmail('')
                fetchMembers()
            } else {
                throw new Error('Failed to send invite')
            }
        } catch (error) {
            addToast('Failed to send invite', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/org/member/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({ role: newRole }),
            })

            if (response.ok) {
                addToast('Role updated successfully', 'success')
                fetchMembers()
            } else {
                throw new Error('Failed to update role')
            }
        } catch (error) {
            addToast('Failed to update role', 'error')
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return

        try {
            const response = await fetch(`/api/org/member/${userId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            if (response.ok) {
                addToast('Member removed successfully', 'success')
                fetchMembers()
            } else {
                throw new Error('Failed to remove member')
            }
        } catch (error) {
            addToast('Failed to remove member', 'error')
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
                    <h1 className="text-3xl font-semibold">Organization Management</h1>

                    {/* Invite Member */}
                    <div className="glass-card">
                        <h2 className="text-xl font-semibold mb-4">Invite Team Member</h2>
                        <form onSubmit={handleInvite} className="flex gap-4">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Email address"
                                className="input flex-1"
                                required
                            />
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="input"
                            >
                                <option value="VIEWER">Viewer</option>
                                <option value="ACCOUNTANT">Accountant</option>
                                <option value="ADMIN">Admin</option>
                                <option value="OWNER">Owner</option>
                            </select>
                            <button type="submit" disabled={loading} className="btn btn-gold">
                                {loading ? 'Sending...' : 'Send Invite'}
                            </button>
                        </form>
                    </div>

                    {/* Team Members */}
                    <div className="glass-card">
                        <h2 className="text-xl font-semibold mb-6">Team Members</h2>
                        <div className="space-y-4">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 bg-glass-bg rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-accent-gold bg-opacity-20 flex items-center justify-center text-accent-gold font-semibold">
                                            {member.firstName?.[0] || member.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {member.firstName} {member.lastName}
                                            </p>
                                            <p className="text-sm text-text-gray">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <select
                                            value={member.role}
                                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                            className="input"
                                            disabled={member.role === 'OWNER' || user?.role !== 'OWNER'}
                                        >
                                            <option value="VIEWER">Viewer</option>
                                            <option value="ACCOUNTANT">Accountant</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="OWNER">Owner</option>
                                        </select>

                                        {member.role !== 'OWNER' && ['OWNER', 'ADMIN'].includes(user?.role || '') && (
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
