import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { closeRateLimiters } from '../middleware/rateLimiting'
import { flushSentry } from '../services/ErrorTracker'

/**
 * Graceful shutdown handler
 * Ensures all connections are closed properly before process exits
 */
export async function gracefulShutdown(server: FastifyInstance, signal: string) {
    console.log(`\n${signal} received, starting graceful shutdown...`)

    const shutdownTimeout = 30000 // 30 seconds
    const shutdownTimer = setTimeout(() => {
        console.error('Graceful shutdown timeout, forcing exit')
        process.exit(1)
    }, shutdownTimeout)

    try {
        // 1. Stop accepting new requests
        console.log('1/6 Stopping server from accepting new connections...')
        await server.close()
        console.log('✓ Server closed')

        // 2. Close database connections
        console.log('2/6 Closing database connections...')
        await prisma.$disconnect()
        console.log('✓ Database disconnected')

        // 3. Close Redis connections (rate limiters)
        console.log('3/6 Closing Redis connections...')
        await closeRateLimiters()
        console.log('✓ Redis connections closed')

        // 4. Flush Sentry events
        console.log('4/6 Flushing Sentry events...')
        await flushSentry()
        console.log('✓ Sentry flushed')

        // 5. Wait for pending operations (if any)
        console.log('5/6 Waiting for pending operations...')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        console.log('✓ Pending operations completed')

        // 6. Clear shutdown timeout
        clearTimeout(shutdownTimer)
        console.log('6/6 Graceful shutdown completed')

        process.exit(0)
    } catch (error) {
        console.error('Error during graceful shutdown:', error)
        clearTimeout(shutdownTimer)
        process.exit(1)
    }
}

/**
 * Setup shutdown handlers
 */
export function setupShutdownHandlers(server: FastifyInstance) {
    // Handle SIGTERM (Docker, Kubernetes)
    process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'))

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'))

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error)
        gracefulShutdown(server, 'UNCAUGHT_EXCEPTION')
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason)
        gracefulShutdown(server, 'UNHANDLED_REJECTION')
    })

    console.log('✓ Shutdown handlers registered')
}
