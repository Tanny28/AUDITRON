import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { apiKeyService } from '../services/ApiKeyService'
import { AgentLogger } from '../services/AgentLogger'

const logger = new AgentLogger('ApiKeyRoutes')

export async function apiKeyRoutes(fastify: FastifyInstance) {
    /**
     * POST /api-keys/generate
     * Generate new API key
     */
    fastify.post(
        '/api-keys/generate',
        { preHandler: [authenticate] },
        async (request, reply) => {
            // Only owners and admins can generate API keys
            if (!['OWNER', 'ADMIN'].includes(request.user.role)) {
                return reply.code(403).send({ error: 'Insufficient permissions' })
            }

            const { name } = request.body as { name?: string }

            try {
                const result = await apiKeyService.generateApiKey(
                    request.user.orgId,
                    request.user.id,
                    name
                )

                return reply.send({
                    message: 'API key generated successfully',
                    apiKey: result.apiKey,
                    maskedKey: result.maskedKey,
                    warning: 'Store this key securely. It will not be shown again.',
                })
            } catch (error: any) {
                if (error.message.includes('already has an active API key')) {
                    return reply.code(400).send({ error: error.message })
                }

                logger.error('Failed to generate API key', { error: error.message })
                return reply.code(500).send({ error: 'Failed to generate API key' })
            }
        }
    )

    /**
     * POST /api-keys/rotate
     * Rotate API key
     */
    fastify.post(
        '/api-keys/rotate',
        { preHandler: [authenticate] },
        async (request, reply) => {
            // Only owners and admins can rotate API keys
            if (!['OWNER', 'ADMIN'].includes(request.user.role)) {
                return reply.code(403).send({ error: 'Insufficient permissions' })
            }

            try {
                const result = await apiKeyService.rotateApiKey(
                    request.user.orgId,
                    request.user.id
                )

                return reply.send({
                    message: 'API key rotated successfully',
                    apiKey: result.apiKey,
                    maskedKey: result.maskedKey,
                    warning: 'Old key has been disabled. Update your integrations with the new key.',
                })
            } catch (error: any) {
                logger.error('Failed to rotate API key', { error: error.message })
                return reply.code(500).send({ error: 'Failed to rotate API key' })
            }
        }
    )

    /**
     * POST /api-keys/disable
     * Disable current API key
     */
    fastify.post(
        '/api-keys/disable',
        { preHandler: [authenticate] },
        async (request, reply) => {
            // Only owners and admins can disable API keys
            if (!['OWNER', 'ADMIN'].includes(request.user.role)) {
                return reply.code(403).send({ error: 'Insufficient permissions' })
            }

            try {
                await apiKeyService.disableApiKey(request.user.orgId)

                return reply.send({
                    message: 'API key disabled successfully',
                })
            } catch (error: any) {
                logger.error('Failed to disable API key', { error: error.message })
                return reply.code(500).send({ error: 'Failed to disable API key' })
            }
        }
    )

    /**
     * GET /api-keys/list
     * List all API keys for organization
     */
    fastify.get(
        '/api-keys/list',
        { preHandler: [authenticate] },
        async (request, reply) => {
            try {
                const keys = await apiKeyService.listApiKeys(request.user.orgId)

                return reply.send({ keys })
            } catch (error: any) {
                logger.error('Failed to list API keys', { error: error.message })
                return reply.code(500).send({ error: 'Failed to list API keys' })
            }
        }
    )

    /**
     * POST /api-keys/validate
     * Validate API key (for testing purposes)
     */
    fastify.post('/api-keys/validate', async (request, reply) => {
        const { apiKey } = request.body as { apiKey: string }

        if (!apiKey) {
            return reply.code(400).send({ error: 'apiKey is required' })
        }

        try {
            const result = await apiKeyService.validateApiKey(apiKey)

            if (!result.valid) {
                return reply.code(401).send({ error: 'Invalid API key' })
            }

            return reply.send({
                valid: true,
                orgId: result.orgId,
            })
        } catch (error: any) {
            logger.error('Failed to validate API key', { error: error.message })
            return reply.code(500).send({ error: 'Failed to validate API key' })
        }
    })
}

/**
 * API Key Authentication Middleware
 * 
 * Use this middleware for endpoints that accept API key authentication
 */
export async function authenticateApiKey(request: any, reply: any) {
    const apiKey = request.headers['x-api-key'] as string

    if (!apiKey) {
        return reply.code(401).send({ error: 'API key required' })
    }

    const result = await apiKeyService.validateApiKey(apiKey)

    if (!result.valid) {
        return reply.code(401).send({ error: 'Invalid API key' })
    }

    // Attach org info to request
    request.apiKeyAuth = {
        orgId: result.orgId,
        keyId: result.keyId,
    }
}
