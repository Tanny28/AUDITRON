import { prisma } from '../lib/prisma'
import { AgentLogger } from './AgentLogger'
import { randomBytes } from 'crypto'

const logger = new AgentLogger('OrgManagementService')

/**
 * OrgManagementService - Multi-organization management
 */
export class OrgManagementService {
    /**
     * Create new organization
     */
    async createOrganization(
        name: string,
        email: string,
        userId: string
    ): Promise<any> {
        try {
            const org = await prisma.organization.create({
                data: {
                    name,
                    email,
                    users: {
                        connect: { id: userId },
                    },
                },
            })

            // Set user as owner
            await prisma.user.update({
                where: { id: userId },
                data: {
                    orgId: org.id,
                    role: 'OWNER',
                },
            })

            logger.info('Organization created', { orgId: org.id, userId })

            return org
        } catch (error: any) {
            logger.error('Failed to create organization', { error: error.message })
            throw error
        }
    }

    /**
     * Switch user to different organization
     */
    async switchOrganization(userId: string, orgId: string): Promise<void> {
        try {
            // Verify user has access to this org
            const membership = await prisma.user.findFirst({
                where: {
                    id: userId,
                    orgId,
                },
            })

            if (!membership) {
                throw new Error('User does not have access to this organization')
            }

            // Update current org
            await prisma.user.update({
                where: { id: userId },
                data: { orgId },
            })

            logger.info('Organization switched', { userId, orgId })
        } catch (error: any) {
            logger.error('Failed to switch organization', { userId, error: error.message })
            throw error
        }
    }

    /**
     * Invite member to organization
     */
    async inviteMember(
        orgId: string,
        email: string,
        role: string,
        invitedBy: string
    ): Promise<{ inviteToken: string }> {
        try {
            // Generate invite token
            const inviteToken = randomBytes(32).toString('hex')

            // Create invite record
            await prisma.organizationInvite.create({
                data: {
                    orgId,
                    email,
                    role,
                    inviteToken,
                    invitedBy,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                },
            })

            logger.info('Member invited', { orgId, email, role })

            // TODO: Send email with invite link
            // const inviteUrl = `${config.APP_URL}/invite/${inviteToken}`
            // await emailService.sendInvite(email, inviteUrl)

            return { inviteToken }
        } catch (error: any) {
            logger.error('Failed to invite member', { orgId, error: error.message })
            throw error
        }
    }

    /**
     * Accept organization invite
     */
    async acceptInvite(inviteToken: string, userId: string): Promise<void> {
        try {
            const invite = await prisma.organizationInvite.findUnique({
                where: { inviteToken },
            })

            if (!invite) {
                throw new Error('Invalid invite token')
            }

            if (invite.expiresAt < new Date()) {
                throw new Error('Invite has expired')
            }

            if (invite.acceptedAt) {
                throw new Error('Invite already accepted')
            }

            // Add user to organization
            await prisma.user.update({
                where: { id: userId },
                data: {
                    orgId: invite.orgId,
                    role: invite.role as any,
                },
            })

            // Mark invite as accepted
            await prisma.organizationInvite.update({
                where: { inviteToken },
                data: {
                    acceptedAt: new Date(),
                    acceptedBy: userId,
                },
            })

            logger.info('Invite accepted', { inviteToken, userId })
        } catch (error: any) {
            logger.error('Failed to accept invite', { inviteToken, error: error.message })
            throw error
        }
    }

    /**
     * Assign role to member
     */
    async assignRole(orgId: string, userId: string, role: string): Promise<void> {
        try {
            // Verify user belongs to org
            const user = await prisma.user.findFirst({
                where: { id: userId, orgId },
            })

            if (!user) {
                throw new Error('User not found in organization')
            }

            // Update role
            await prisma.user.update({
                where: { id: userId },
                data: { role: role as any },
            })

            logger.info('Role assigned', { orgId, userId, role })
        } catch (error: any) {
            logger.error('Failed to assign role', { orgId, userId, error: error.message })
            throw error
        }
    }

    /**
     * List organization members
     */
    async listMembers(orgId: string): Promise<any[]> {
        try {
            const members = await prisma.user.findMany({
                where: { orgId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    createdAt: true,
                    profilePictureUrl: true,
                },
            })

            return members
        } catch (error: any) {
            logger.error('Failed to list members', { orgId, error: error.message })
            throw error
        }
    }

    /**
     * Remove member from organization
     */
    async removeMember(orgId: string, userId: string): Promise<void> {
        try {
            const user = await prisma.user.findFirst({
                where: { id: userId, orgId },
            })

            if (!user) {
                throw new Error('User not found in organization')
            }

            if (user.role === 'OWNER') {
                throw new Error('Cannot remove organization owner')
            }

            // Remove user from org (set to null or delete based on requirements)
            await prisma.user.update({
                where: { id: userId },
                data: { orgId: null, role: 'USER' },
            })

            logger.info('Member removed', { orgId, userId })
        } catch (error: any) {
            logger.error('Failed to remove member', { orgId, userId, error: error.message })
            throw error
        }
    }

    /**
     * Get organization details
     */
    async getOrganization(orgId: string): Promise<any> {
        try {
            const org = await prisma.organization.findUnique({
                where: { id: orgId },
                include: {
                    users: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                        },
                    },
                },
            })

            if (!org) {
                throw new Error('Organization not found')
            }

            return org
        } catch (error: any) {
            logger.error('Failed to get organization', { orgId, error: error.message })
            throw error
        }
    }
}

export const orgManagementService = new OrgManagementService()
