import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { userSettingsService } from '../services/UserSettingsService'
import { AgentLogger } from '../services/AgentLogger'

const logger = new AgentLogger('SettingsRoutes')

export async function settingsRoutes(fastify: FastifyInstance) {
    /**
     * GET /settings
     * Get user settings
     */
    fastify.get(
        '/settings',
        { preHandler: [authenticate] },
        async (request, reply) => {
            try {
                const settings = await userSettingsService.getUserSettings(request.user.id)
                return reply.send(settings)
            } catch (error: any) {
                logger.error('Failed to get settings', { error: error.message })
                return reply.code(500).send({ error: 'Failed to get settings' })
            }
        }
    )

    /**
     * PATCH /settings/profile
     * Update user profile
     */
    fastify.patch(
        '/settings/profile',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { firstName, lastName, phone, timezone } = request.body as any

            try {
                const profile = await userSettingsService.updateProfile(request.user.id, {
                    firstName,
                    lastName,
                    phone,
                    timezone,
                })

                return reply.send(profile)
            } catch (error: any) {
                logger.error('Failed to update profile', { error: error.message })
                return reply.code(500).send({ error: 'Failed to update profile' })
            }
        }
    )

    /**
     * PATCH /settings/notifications
     * Update notification preferences
     */
    fastify.patch(
        '/settings/notifications',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const preferences = request.body as any

            try {
                const updated = await userSettingsService.updateNotificationPreferences(
                    request.user.id,
                    preferences
                )

                return reply.send(updated)
            } catch (error: any) {
                logger.error('Failed to update notifications', { error: error.message })
                return reply.code(500).send({ error: 'Failed to update notifications' })
            }
        }
    )

    /**
     * POST /settings/password
     * Change password
     */
    fastify.post(
        '/settings/password',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { currentPassword, newPassword } = request.body as {
                currentPassword: string
                newPassword: string
            }

            if (!currentPassword || !newPassword) {
                return reply.code(400).send({ error: 'Both passwords are required' })
            }

            if (newPassword.length < 8) {
                return reply.code(400).send({ error: 'Password must be at least 8 characters' })
            }

            try {
                await userSettingsService.changePassword(
                    request.user.id,
                    currentPassword,
                    newPassword
                )

                return reply.send({ message: 'Password changed successfully' })
            } catch (error: any) {
                if (error.message === 'Current password is incorrect') {
                    return reply.code(400).send({ error: error.message })
                }

                logger.error('Failed to change password', { error: error.message })
                return reply.code(500).send({ error: 'Failed to change password' })
            }
        }
    )

    /**
     * POST /settings/profile-picture
     * Upload profile picture
     */
    fastify.post(
        '/settings/profile-picture',
        { preHandler: [authenticate] },
        async (request, reply) => {
            // TODO: Implement file upload to MinIO
            // For now, accept a URL
            const { url } = request.body as { url: string }

            if (!url) {
                return reply.code(400).send({ error: 'URL is required' })
            }

            try {
                const fileUrl = await userSettingsService.uploadProfilePicture(request.user.id, url)

                return reply.send({ url: fileUrl })
            } catch (error: any) {
                logger.error('Failed to upload profile picture', { error: error.message })
                return reply.code(500).send({ error: 'Failed to upload profile picture' })
            }
        }
    )
}
