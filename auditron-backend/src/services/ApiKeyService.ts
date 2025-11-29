import { prisma } from '../lib/prisma'
import { randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'
import { AgentLogger } from './AgentLogger'

const scryptAsync = promisify(scrypt)
const logger = new AgentLogger('ApiKeyService')

const API_KEY_PREFIX = 'ak_'
const KEY_LENGTH = 32

/**
 * ApiKeyService - Secure API key management
 * 
 * Security features:
 * - Keys are hashed using scrypt before storage
 * - Plaintext key returned only once at creation
 * - Rate limiting recommended for API key endpoints
 * - Keys can be rotated and disabled
 */
export class ApiKeyService {
    /**
     * Generate new API key for organization
     */
    async generateApiKey(
        orgId: string,
        createdBy: string,
        name?: string
    ): Promise<{ apiKey: string; maskedKey: string }> {
        try {
            // Check if org already has an active key
            const existingKey = await prisma.apiKey.findFirst({
                where: {
                    orgId,
                    active: true,
                },
            })

            if (existingKey) {
                throw new Error('Organization already has an active API key. Rotate or disable it first.')
            }

            // Generate random API key
            const rawKey = this.generateRawKey()
            const apiKey = `${API_KEY_PREFIX}${rawKey}`

            // Hash the key for storage
            const hashedKey = await this.hashKey(apiKey)

            // Get last 4 characters for masking
            const last4 = rawKey.slice(-4)
            const maskedKey = `${API_KEY_PREFIX}${'*'.repeat(rawKey.length - 4)}${last4}`

            // Store in database
            await prisma.apiKey.create({
                data: {
                    orgId,
                    name: name || 'Default API Key',
                    hashedKey,
                    maskedKey,
                    createdBy,
                    active: true,
                },
            })

            logger.info('API key generated', { orgId, maskedKey })

            // Return plaintext key (only time it's visible)
            return {
                apiKey,
                maskedKey,
            }
        } catch (error: any) {
            logger.error('Failed to generate API key', { orgId, error: error.message })
            throw error
        }
    }

    /**
     * Rotate API key (disable old, create new)
     */
    async rotateApiKey(
        orgId: string,
        createdBy: string
    ): Promise<{ apiKey: string; maskedKey: string }> {
        try {
            // Disable all existing keys
            await prisma.apiKey.updateMany({
                where: {
                    orgId,
                    active: true,
                },
                data: {
                    active: false,
                    disabledAt: new Date(),
                },
            })

            // Generate new key
            const result = await this.generateApiKey(orgId, createdBy, 'Rotated API Key')

            logger.info('API key rotated', { orgId, maskedKey: result.maskedKey })

            return result
        } catch (error: any) {
            logger.error('Failed to rotate API key', { orgId, error: error.message })
            throw error
        }
    }

    /**
     * Validate API key
     */
    async validateApiKey(rawKey: string): Promise<{
        valid: boolean
        orgId?: string
        keyId?: string
    }> {
        try {
            // Get all active keys
            const activeKeys = await prisma.apiKey.findMany({
                where: { active: true },
            })

            // Check each key
            for (const key of activeKeys) {
                const isValid = await this.compareKeys(rawKey, key.hashedKey)

                if (isValid) {
                    // Update last used timestamp
                    await prisma.apiKey.update({
                        where: { id: key.id },
                        data: { lastUsedAt: new Date() },
                    })

                    logger.info('API key validated', {
                        orgId: key.orgId,
                        keyId: key.id,
                    })

                    return {
                        valid: true,
                        orgId: key.orgId,
                        keyId: key.id,
                    }
                }
            }

            logger.warn('Invalid API key attempt')

            return { valid: false }
        } catch (error: any) {
            logger.error('Failed to validate API key', { error: error.message })
            return { valid: false }
        }
    }

    /**
     * Disable API key
     */
    async disableApiKey(orgId: string): Promise<void> {
        try {
            await prisma.apiKey.updateMany({
                where: {
                    orgId,
                    active: true,
                },
                data: {
                    active: false,
                    disabledAt: new Date(),
                },
            })

            logger.info('API key disabled', { orgId })
        } catch (error: any) {
            logger.error('Failed to disable API key', { orgId, error: error.message })
            throw error
        }
    }

    /**
     * List API keys for organization
     */
    async listApiKeys(orgId: string): Promise<any[]> {
        try {
            const keys = await prisma.apiKey.findMany({
                where: { orgId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    maskedKey: true,
                    active: true,
                    createdAt: true,
                    createdBy: true,
                    lastUsedAt: true,
                    disabledAt: true,
                },
            })

            return keys
        } catch (error: any) {
            logger.error('Failed to list API keys', { orgId, error: error.message })
            throw error
        }
    }

    /**
     * Generate raw key
     */
    private generateRawKey(): string {
        return randomBytes(KEY_LENGTH).toString('hex')
    }

    /**
     * Hash API key using scrypt
     */
    private async hashKey(key: string): Promise<string> {
        const salt = randomBytes(16).toString('hex')
        const derivedKey = (await scryptAsync(key, salt, 64)) as Buffer
        return `${salt}:${derivedKey.toString('hex')}`
    }

    /**
     * Compare raw key with hashed key
     */
    private async compareKeys(rawKey: string, hashedKey: string): Promise<boolean> {
        const [salt, hash] = hashedKey.split(':')
        const derivedKey = (await scryptAsync(rawKey, salt, 64)) as Buffer
        return hash === derivedKey.toString('hex')
    }
}

export const apiKeyService = new ApiKeyService()

/**
 * RATE LIMITING RECOMMENDATIONS:
 * 
 * 1. API Key Generation/Rotation:
 *    - Limit: 5 requests per hour per organization
 *    - Prevents abuse and key exhaustion
 * 
 * 2. API Key Validation:
 *    - Limit: 1000 requests per minute per key
 *    - Use Redis for fast rate limiting
 * 
 * 3. Failed Validation Attempts:
 *    - Lock after 10 failed attempts in 5 minutes
 *    - Send alert to organization owner
 * 
 * Implementation example:
 * ```typescript
 * import rateLimit from 'express-rate-limit'
 * 
 * const apiKeyRateLimit = rateLimit({
 *   windowMs: 60 * 60 * 1000, // 1 hour
 *   max: 5,
 *   message: 'Too many API key operations'
 * })
 * ```
 */
