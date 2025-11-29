import Redis from 'ioredis'
import { config } from '../config'
import { logger } from '../lib/logger'

/**
 * Redis Cache Service
 * Provides caching functionality with TTL and invalidation
 */

// Redis client
const redis = new Redis({
    host: config.REDIS_URL.split('://')[1].split(':')[0],
    port: parseInt(config.REDIS_URL.split(':')[2] || '6379'),
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
    },
    maxRetriesPerRequest: 3,
})

redis.on('error', (err) => {
    logger.error({ err }, 'Redis connection error')
})

redis.on('connect', () => {
    logger.info('Redis connected')
})

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    DAY: 86400, // 24 hours
} as const

/**
 * Cache key prefixes
 */
export const CachePrefix = {
    USER: 'user',
    ORG: 'org',
    INVOICE: 'invoice',
    TRANSACTION: 'transaction',
    REPORT: 'report',
    API_KEY: 'apikey',
    SESSION: 'session',
} as const

/**
 * Generate cache key
 */
function generateKey(prefix: string, id: string): string {
    return `${prefix}:${id}`
}

/**
 * Cache service
 */
export const CacheService = {
    /**
     * Get value from cache
     */
    async get<T>(prefix: string, id: string): Promise<T | null> {
        try {
            const key = generateKey(prefix, id)
            const value = await redis.get(key)

            if (!value) {
                return null
            }

            return JSON.parse(value) as T
        } catch (error) {
            logger.error({ error, prefix, id }, 'Cache get error')
            return null
        }
    },

    /**
     * Set value in cache with TTL
     */
    async set(prefix: string, id: string, value: any, ttl: number = CacheTTL.MEDIUM): Promise<void> {
        try {
            const key = generateKey(prefix, id)
            await redis.setex(key, ttl, JSON.stringify(value))
        } catch (error) {
            logger.error({ error, prefix, id }, 'Cache set error')
        }
    },

    /**
     * Delete value from cache
     */
    async delete(prefix: string, id: string): Promise<void> {
        try {
            const key = generateKey(prefix, id)
            await redis.del(key)
        } catch (error) {
            logger.error({ error, prefix, id }, 'Cache delete error')
        }
    },

    /**
     * Delete multiple keys by pattern
     */
    async deletePattern(pattern: string): Promise<void> {
        try {
            const keys = await redis.keys(pattern)
            if (keys.length > 0) {
                await redis.del(...keys)
            }
        } catch (error) {
            logger.error({ error, pattern }, 'Cache delete pattern error')
        }
    },

    /**
     * Get or set (cache-aside pattern)
     */
    async getOrSet<T>(
        prefix: string,
        id: string,
        fetcher: () => Promise<T>,
        ttl: number = CacheTTL.MEDIUM
    ): Promise<T> {
        // Try to get from cache
        const cached = await this.get<T>(prefix, id)
        if (cached !== null) {
            return cached
        }

        // Fetch from source
        const value = await fetcher()

        // Store in cache
        await this.set(prefix, id, value, ttl)

        return value
    },

    /**
     * Invalidate cache for user
     */
    async invalidateUser(userId: string): Promise<void> {
        await this.delete(CachePrefix.USER, userId)
    },

    /**
     * Invalidate cache for organization
     */
    async invalidateOrg(orgId: string): Promise<void> {
        await this.delete(CachePrefix.ORG, orgId)
        await this.deletePattern(`${CachePrefix.INVOICE}:${orgId}:*`)
        await this.deletePattern(`${CachePrefix.TRANSACTION}:${orgId}:*`)
        await this.deletePattern(`${CachePrefix.REPORT}:${orgId}:*`)
    },

    /**
     * Invalidate all reports for organization
     */
    async invalidateOrgReports(orgId: string): Promise<void> {
        await this.deletePattern(`${CachePrefix.REPORT}:${orgId}:*`)
    },

    /**
     * Cache API key validation result
     */
    async cacheApiKeyValidation(keyHash: string, result: any, ttl: number = CacheTTL.SHORT): Promise<void> {
        await this.set(CachePrefix.API_KEY, keyHash, result, ttl)
    },

    /**
     * Get cached API key validation
     */
    async getCachedApiKeyValidation(keyHash: string): Promise<any | null> {
        return this.get(CachePrefix.API_KEY, keyHash)
    },

    /**
     * Increment counter (for rate limiting, analytics)
     */
    async increment(key: string, ttl?: number): Promise<number> {
        try {
            const value = await redis.incr(key)
            if (ttl && value === 1) {
                await redis.expire(key, ttl)
            }
            return value
        } catch (error) {
            logger.error({ error, key }, 'Cache increment error')
            return 0
        }
    },

    /**
     * Check if key exists
     */
    async exists(prefix: string, id: string): Promise<boolean> {
        try {
            const key = generateKey(prefix, id)
            const exists = await redis.exists(key)
            return exists === 1
        } catch (error) {
            logger.error({ error, prefix, id }, 'Cache exists error')
            return false
        }
    },

    /**
     * Get multiple keys at once
     */
    async mget<T>(prefix: string, ids: string[]): Promise<(T | null)[]> {
        try {
            const keys = ids.map((id) => generateKey(prefix, id))
            const values = await redis.mget(...keys)

            return values.map((value) => {
                if (!value) return null
                try {
                    return JSON.parse(value) as T
                } catch {
                    return null
                }
            })
        } catch (error) {
            logger.error({ error, prefix, ids }, 'Cache mget error')
            return ids.map(() => null)
        }
    },

    /**
     * Flush all cache (use with caution!)
     */
    async flushAll(): Promise<void> {
        try {
            await redis.flushall()
            logger.warn('Cache flushed')
        } catch (error) {
            logger.error({ error }, 'Cache flush error')
        }
    },

    /**
     * Get cache statistics
     */
    async getStats(): Promise<any> {
        try {
            const info = await redis.info('stats')
            const dbSize = await redis.dbsize()

            return {
                dbSize,
                info,
            }
        } catch (error) {
            logger.error({ error }, 'Cache stats error')
            return null
        }
    },

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        await redis.quit()
    },
}

export default CacheService
