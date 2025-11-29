import { FastifyRequest, FastifyReply } from 'fastify'
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible'
import Redis from 'ioredis'
import { config } from '../config'

// Redis client for rate limiting
const redisClient = new Redis({
    host: config.REDIS_URL.split('://')[1].split(':')[0],
    port: parseInt(config.REDIS_URL.split(':')[2] || '6379'),
    enableOfflineQueue: false,
})

// Fallback to memory if Redis is unavailable
let rateLimiter: RateLimiterRedis | RateLimiterMemory

try {
    rateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl',
        points: 100, // Number of requests
        duration: 60, // Per 60 seconds
    })
} catch (error) {
    console.warn('Redis unavailable for rate limiting, falling back to memory')
    rateLimiter = new RateLimiterMemory({
        points: 100,
        duration: 60,
    })
}

/**
 * Rate Limiter Configurations
 */
export const rateLimiters = {
    // Strict rate limit for authentication endpoints
    auth: new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl_auth',
        points: 5, // 5 attempts
        duration: 900, // Per 15 minutes
        blockDuration: 900, // Block for 15 minutes after limit
    }),

    // API key generation/rotation (very strict)
    apiKeyManagement: new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl_apikey',
        points: 5, // 5 operations
        duration: 3600, // Per hour
        blockDuration: 3600,
    }),

    // API calls using API keys
    apiKeyUsage: new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl_apikey_usage',
        points: 1000, // 1000 requests
        duration: 60, // Per minute
    }),

    // File uploads
    fileUpload: new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl_upload',
        points: 10, // 10 uploads
        duration: 60, // Per minute
    }),

    // General API endpoints
    api: new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl_api',
        points: 100, // 100 requests
        duration: 60, // Per minute
    }),

    // Webhook endpoints
    webhook: new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl_webhook',
        points: 50,
        duration: 60,
    }),
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimiter(
    limiter: RateLimiterRedis | RateLimiterMemory,
    options: {
        keyGenerator?: (request: FastifyRequest) => string
        skipSuccessfulRequests?: boolean
    } = {}
) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const key =
            options.keyGenerator?.(request) ||
            request.user?.id ||
            request.ip ||
            'anonymous'

        try {
            await limiter.consume(key)
        } catch (rejRes: any) {
            const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 1

            reply.header('Retry-After', retryAfter.toString())
            reply.header('X-RateLimit-Limit', limiter.points.toString())
            reply.header('X-RateLimit-Remaining', '0')
            reply.header('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString())

            return reply.code(429).send({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
                retryAfter,
            })
        }

        // Add rate limit headers to successful requests
        const limiterRes = await limiter.get(key)
        if (limiterRes) {
            reply.header('X-RateLimit-Limit', limiter.points.toString())
            reply.header('X-RateLimit-Remaining', limiterRes.remainingPoints.toString())
            reply.header(
                'X-RateLimit-Reset',
                new Date(Date.now() + limiterRes.msBeforeNext).toISOString()
            )
        }
    }
}

/**
 * IP-based rate limiter
 */
export const ipRateLimiter = createRateLimiter(rateLimiters.api, {
    keyGenerator: (request) => request.ip,
})

/**
 * User-based rate limiter
 */
export const userRateLimiter = createRateLimiter(rateLimiters.api, {
    keyGenerator: (request) => request.user?.id || request.ip,
})

/**
 * Auth rate limiter (strict)
 */
export const authRateLimiter = createRateLimiter(rateLimiters.auth, {
    keyGenerator: (request) => {
        const body = request.body as any
        return body?.email || request.ip
    },
})

/**
 * API key management rate limiter (very strict)
 */
export const apiKeyManagementRateLimiter = createRateLimiter(rateLimiters.apiKeyManagement, {
    keyGenerator: (request) => request.user?.orgId || request.user?.id || request.ip,
})

/**
 * File upload rate limiter
 */
export const fileUploadRateLimiter = createRateLimiter(rateLimiters.fileUpload, {
    keyGenerator: (request) => request.user?.id || request.ip,
})

/**
 * Webhook rate limiter
 */
export const webhookRateLimiter = createRateLimiter(rateLimiters.webhook, {
    keyGenerator: (request) => request.headers['stripe-signature'] as string || request.ip,
})

/**
 * Cleanup on shutdown
 */
export async function closeRateLimiters() {
    await redisClient.quit()
}
