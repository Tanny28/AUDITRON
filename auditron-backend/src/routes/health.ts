import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import Redis from 'ioredis'
import { config } from '../config'

/**
 * Health check response interface
 */
interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    version: string
    checks: {
        database: HealthStatus
        redis: HealthStatus
        minio: HealthStatus
        queue: HealthStatus
        memory: HealthStatus
        disk: HealthStatus
    }
}

interface HealthStatus {
    status: 'up' | 'down' | 'degraded'
    latency?: number
    message?: string
    details?: any
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthStatus> {
    const start = Date.now()

    try {
        await prisma.$queryRaw`SELECT 1`
        const latency = Date.now() - start

        return {
            status: latency < 100 ? 'up' : 'degraded',
            latency,
            message: latency < 100 ? 'Connected' : 'Slow response',
        }
    } catch (error: any) {
        return {
            status: 'down',
            message: error.message,
        }
    }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthStatus> {
    const start = Date.now()
    const redis = new Redis({
        host: config.REDIS_URL.split('://')[1].split(':')[0],
        port: parseInt(config.REDIS_URL.split(':')[2] || '6379'),
        lazyConnect: true,
    })

    try {
        await redis.connect()
        await redis.ping()
        const latency = Date.now() - start
        await redis.quit()

        return {
            status: latency < 50 ? 'up' : 'degraded',
            latency,
            message: latency < 50 ? 'Connected' : 'Slow response',
        }
    } catch (error: any) {
        return {
            status: 'down',
            message: error.message,
        }
    }
}

/**
 * Check MinIO connectivity
 */
async function checkMinIO(): Promise<HealthStatus> {
    const start = Date.now()

    try {
        // Simple HTTP check to MinIO health endpoint
        const response = await fetch(`http://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}/minio/health/live`, {
            signal: AbortSignal.timeout(5000),
        })

        const latency = Date.now() - start

        if (response.ok) {
            return {
                status: latency < 100 ? 'up' : 'degraded',
                latency,
                message: 'Connected',
            }
        } else {
            return {
                status: 'down',
                message: `HTTP ${response.status}`,
            }
        }
    } catch (error: any) {
        return {
            status: 'down',
            message: error.message,
        }
    }
}

/**
 * Check queue health
 */
async function checkQueue(): Promise<HealthStatus> {
    try {
        // Check if queue is accessible via Redis
        const redis = new Redis({
            host: config.REDIS_URL.split('://')[1].split(':')[0],
            port: parseInt(config.REDIS_URL.split(':')[2] || '6379'),
            lazyConnect: true,
        })

        await redis.connect()
        const queueKeys = await redis.keys('bull:agentic-jobs:*')
        await redis.quit()

        return {
            status: 'up',
            message: 'Queue accessible',
            details: {
                keys: queueKeys.length,
            },
        }
    } catch (error: any) {
        return {
            status: 'down',
            message: error.message,
        }
    }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthStatus {
    const usage = process.memoryUsage()
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100

    return {
        status: heapUsagePercent < 80 ? 'up' : heapUsagePercent < 90 ? 'degraded' : 'down',
        message: `${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`,
        details: {
            heapUsed: heapUsedMB,
            heapTotal: heapTotalMB,
            rss: Math.round(usage.rss / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024),
        },
    }
}

/**
 * Check disk space (simplified)
 */
function checkDisk(): HealthStatus {
    // Note: Proper disk check requires OS-specific modules
    // This is a placeholder
    return {
        status: 'up',
        message: 'Disk check not implemented',
    }
}

/**
 * Comprehensive health check endpoint
 */
export async function healthCheck(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<HealthCheckResponse> {
    const [database, redis, minio, queue, memory, disk] = await Promise.all([
        checkDatabase(),
        checkRedis(),
        checkMinIO(),
        checkQueue(),
        Promise.resolve(checkMemory()),
        Promise.resolve(checkDisk()),
    ])

    const checks = { database, redis, minio, queue, memory, disk }

    // Determine overall status
    const statuses = Object.values(checks).map((check) => check.status)
    const hasDown = statuses.includes('down')
    const hasDegraded = statuses.includes('degraded')

    const overallStatus = hasDown ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy'

    const response: HealthCheckResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks,
    }

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

    return reply.code(statusCode).send(response)
}

/**
 * Simple liveness probe (for Kubernetes)
 */
export async function livenessProbe(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ status: 'alive' })
}

/**
 * Readiness probe (for Kubernetes)
 */
export async function readinessProbe(request: FastifyRequest, reply: FastifyReply) {
    try {
        // Check if database is accessible
        await prisma.$queryRaw`SELECT 1`
        return reply.send({ status: 'ready' })
    } catch (error) {
        return reply.code(503).send({ status: 'not ready' })
    }
}
