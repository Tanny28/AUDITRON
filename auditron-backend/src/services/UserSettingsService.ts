import { prisma } from '../lib/prisma'
import { hash } from 'bcrypt'
import { AgentLogger } from './AgentLogger'

const logger = new AgentLogger('UserSettingsService')

interface UserProfileUpdate {
    firstName?: string
    lastName?: string
    phone?: string
    timezone?: string
    profilePictureUrl?: string
}

interface NotificationPreferences {
    emailAlerts?: boolean
    jobAlerts?: boolean
    anomalyAlerts?: boolean
    weeklyReports?: boolean
}

/**
 * UserSettingsService - Manage user profile and preferences
 */
export class UserSettingsService {
    /**
     * Update user profile
     */
    async updateProfile(userId: string, updates: UserProfileUpdate): Promise<any> {
        try {
            const user = await prisma.user.update({
                where: { id: userId },
                data: updates,
            })

            logger.info('User profile updated', { userId })

            return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                timezone: user.timezone,
                profilePictureUrl: user.profilePictureUrl,
            }
        } catch (error: any) {
            logger.error('Failed to update profile', { userId, error: error.message })
            throw error
        }
    }

    /**
     * Update notification preferences
     */
    async updateNotificationPreferences(
        userId: string,
        preferences: NotificationPreferences
    ): Promise<NotificationPreferences> {
        try {
            // TODO: Create NotificationPreferences table in schema
            // For now, store in user metadata
            await prisma.user.update({
                where: { id: userId },
                data: {
                    metadata: preferences as any,
                },
            })

            logger.info('Notification preferences updated', { userId })

            return preferences
        } catch (error: any) {
            logger.error('Failed to update preferences', { userId, error: error.message })
            throw error
        }
    }

    /**
     * Get notification preferences
     */
    async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
            })

            if (!user) {
                throw new Error('User not found')
            }

            // Return preferences from metadata or defaults
            return (user.metadata as NotificationPreferences) || {
                emailAlerts: true,
                jobAlerts: true,
                anomalyAlerts: true,
                weeklyReports: false,
            }
        } catch (error: any) {
            logger.error('Failed to get preferences', { userId, error: error.message })
            throw error
        }
    }

    /**
     * Change password
     */
    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
            })

            if (!user) {
                throw new Error('User not found')
            }

            // Verify current password
            const bcrypt = require('bcrypt')
            const isValid = await bcrypt.compare(currentPassword, user.passwordHash)

            if (!isValid) {
                throw new Error('Current password is incorrect')
            }

            // Hash new password
            const newPasswordHash = await hash(newPassword, 10)

            // Update password
            await prisma.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash },
            })

            logger.info('Password changed', { userId })
        } catch (error: any) {
            logger.error('Failed to change password', { userId, error: error.message })
            throw error
        }
    }

    /**
     * Upload profile picture
     */
    async uploadProfilePicture(userId: string, fileUrl: string): Promise<string> {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { profilePictureUrl: fileUrl },
            })

            logger.info('Profile picture uploaded', { userId, fileUrl })

            return fileUrl
        } catch (error: any) {
            logger.error('Failed to upload profile picture', { userId, error: error.message })
            throw error
        }
    }

    /**
     * Get user settings
     */
    async getUserSettings(userId: string): Promise<any> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    organization: true,
                },
            })

            if (!user) {
                throw new Error('User not found')
            }

            return {
                profile: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    timezone: user.timezone,
                    profilePictureUrl: user.profilePictureUrl,
                },
                organization: {
                    id: user.organization.id,
                    name: user.organization.name,
                    role: user.role,
                },
                notifications: (user.metadata as NotificationPreferences) || {},
            }
        } catch (error: any) {
            logger.error('Failed to get user settings', { userId, error: error.message })
            throw error
        }
    }
}

export const userSettingsService = new UserSettingsService()
