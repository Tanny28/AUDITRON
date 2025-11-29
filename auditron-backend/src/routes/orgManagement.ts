import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { orgManagementService } from '../services/OrgManagementService'
import { AgentLogger } from '../services/AgentLogger'

const logger = new AgentLogger('OrgManagementRoutes')

export async function orgManagementRoutes(fastify: FastifyInstance) {
    /**
     * POST /org/create
     * Create new organization
     */
    fastify.post(
        '/org/create',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { name, email } = request.body as { name: string; email: string }

            if (!name || !email) {
                return reply.code(400).send({ error: 'name and email are required' })
            }

            try {
                const org = await orgManagementService.createOrganization(
                    name,
                    email,
                    request.user.id
                )

                return reply.send(org)
            } catch (error: any) {
                logger.error('Failed to create organization', { error: error.message })
                return reply.code(500).send({ error: 'Failed to create organization' })
            }
        }
    )

    /**
     * POST /org/switch
     * Switch to different organization
     */
    fastify.post(
        '/org/switch',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { orgId } = request.body as { orgId: string }

            if (!orgId) {
                return reply.code(400).send({ error: 'orgId is required' })
            }

            try {
                await orgManagementService.switchOrganization(request.user.id, orgId)

                return reply.send({ message: 'Organization switched successfully' })
            } catch (error: any) {
                if (error.message === 'User does not have access to this organization') {
                    return reply.code(403).send({ error: error.message })
                }

                logger.error('Failed to switch organization', { error: error.message })
                return reply.code(500).send({ error: 'Failed to switch organization' })
            }
        }
    )

    /**
     * POST /org/invite
     * Invite member to organization
     */
    fastify.post(
        '/org/invite',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { email, role } = request.body as { email: string; role: string }

            if (!email || !role) {
                return reply.code(400).send({ error: 'email and role are required' })
            }

            // Verify user has permission to invite
            if (!['OWNER', 'ADMIN'].includes(request.user.role)) {
                return reply.code(403).send({ error: 'Insufficient permissions' })
            }

            try {
                const result = await orgManagementService.inviteMember(
                    request.user.orgId,
                    email,
                    role,
                    request.user.id
                )

                return reply.send({
                    message: 'Invite sent successfully',
                    inviteToken: result.inviteToken,
                })
            } catch (error: any) {
                logger.error('Failed to invite member', { error: error.message })
                return reply.code(500).send({ error: 'Failed to send invite' })
            }
        }
    )

    /**
     * POST /org/accept-invite
     * Accept organization invite
     */
    fastify.post(
        '/org/accept-invite',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { inviteToken } = request.body as { inviteToken: string }

            if (!inviteToken) {
                return reply.code(400).send({ error: 'inviteToken is required' })
            }

            try {
                await orgManagementService.acceptInvite(inviteToken, request.user.id)

                return reply.send({ message: 'Invite accepted successfully' })
            } catch (error: any) {
                if (
                    error.message === 'Invalid invite token' ||
                    error.message === 'Invite has expired' ||
                    error.message === 'Invite already accepted'
                ) {
                    return reply.code(400).send({ error: error.message })
                }

                logger.error('Failed to accept invite', { error: error.message })
                return reply.code(500).send({ error: 'Failed to accept invite' })
            }
        }
    )

    /**
     * PATCH /org/member/:userId/role
     * Assign role to member
     */
    fastify.patch(
        '/org/member/:userId/role',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { userId } = request.params as { userId: string }
            const { role } = request.body as { role: string }

            if (!role) {
                return reply.code(400).send({ error: 'role is required' })
            }

            // Verify user has permission
            if (request.user.role !== 'OWNER') {
                return reply.code(403).send({ error: 'Only owners can assign roles' })
            }

            try {
                await orgManagementService.assignRole(request.user.orgId, userId, role)

                return reply.send({ message: 'Role assigned successfully' })
            } catch (error: any) {
                logger.error('Failed to assign role', { error: error.message })
                return reply.code(500).send({ error: 'Failed to assign role' })
            }
        }
    )

    /**
     * GET /org/members
     * List organization members
     */
    fastify.get(
        '/org/members',
        { preHandler: [authenticate] },
        async (request, reply) => {
            try {
                const members = await orgManagementService.listMembers(request.user.orgId)

                return reply.send({ members })
            } catch (error: any) {
                logger.error('Failed to list members', { error: error.message })
                return reply.code(500).send({ error: 'Failed to list members' })
            }
        }
    )

    /**
     * DELETE /org/member/:userId
     * Remove member from organization
     */
    fastify.delete(
        '/org/member/:userId',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { userId } = request.params as { userId: string }

            // Verify user has permission
            if (!['OWNER', 'ADMIN'].includes(request.user.role)) {
                return reply.code(403).send({ error: 'Insufficient permissions' })
            }

            try {
                await orgManagementService.removeMember(request.user.orgId, userId)

                return reply.send({ message: 'Member removed successfully' })
            } catch (error: any) {
                if (error.message === 'Cannot remove organization owner') {
                    return reply.code(400).send({ error: error.message })
                }

                logger.error('Failed to remove member', { error: error.message })
                return reply.code(500).send({ error: 'Failed to remove member' })
            }
        }
    )

    /**
     * GET /org/:orgId
     * Get organization details
     */
    fastify.get(
        '/org/:orgId',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { orgId } = request.params as { orgId: string }

            // Verify user has access
            if (request.user.orgId !== orgId && request.user.role !== 'ADMIN') {
                return reply.code(403).send({ error: 'Access denied' })
            }

            try {
                const org = await orgManagementService.getOrganization(orgId)

                return reply.send(org)
            } catch (error: any) {
                logger.error('Failed to get organization', { error: error.message })
                return reply.code(500).send({ error: 'Failed to get organization' })
            }
        }
    )
}
