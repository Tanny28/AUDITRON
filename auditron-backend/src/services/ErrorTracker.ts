import * as Sentry from '@sentry/node'
import { ProfilingIntegration } from '@sentry/profiling-node'
import { config } from '../config'

/**
 * Initialize Sentry for error tracking
 */
export function initSentry() {
    if (config.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: config.NODE_ENV,

            // Performance Monitoring
            tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,

            // Profiling
            profilesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
            integrations: [new ProfilingIntegration()],

            // Release tracking
            release: process.env.npm_package_version,

            // Filter sensitive data
            beforeSend(event, hint) {
                // Remove sensitive headers
                if (event.request?.headers) {
                    delete event.request.headers['authorization']
                    delete event.request.headers['cookie']
                    delete event.request.headers['x-api-key']
                }

                // Remove sensitive body data
                if (event.request?.data) {
                    const data = event.request.data as any
                    if (data.password) data.password = '[REDACTED]'
                    if (data.currentPassword) data.currentPassword = '[REDACTED]'
                    if (data.newPassword) data.newPassword = '[REDACTED]'
                    if (data.apiKey) data.apiKey = '[REDACTED]'
                }

                return event
            },
        })

        console.log('✓ Sentry initialized')
    } else {
        console.log('⊘ Sentry not initialized (development mode or missing DSN)')
    }
}

/**
 * Capture exception with context
 */
export function captureException(
    error: Error,
    context?: {
        user?: { id: string; email: string; orgId: string }
        tags?: Record<string, string>
        extra?: Record<string, any>
    }
) {
    Sentry.withScope((scope) => {
        // Add user context
        if (context?.user) {
            scope.setUser({
                id: context.user.id,
                email: context.user.email,
            })
            scope.setTag('orgId', context.user.orgId)
        }

        // Add tags
        if (context?.tags) {
            Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value)
            })
        }

        // Add extra context
        if (context?.extra) {
            Object.entries(context.extra).forEach(([key, value]) => {
                scope.setExtra(key, value)
            })
        }

        Sentry.captureException(error)
    })
}

/**
 * Capture message with context
 */
export function captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
    context?: {
        user?: { id: string; email: string; orgId: string }
        tags?: Record<string, string>
        extra?: Record<string, any>
    }
) {
    Sentry.withScope((scope) => {
        if (context?.user) {
            scope.setUser({
                id: context.user.id,
                email: context.user.email,
            })
            scope.setTag('orgId', context.user.orgId)
        }

        if (context?.tags) {
            Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value)
            })
        }

        if (context?.extra) {
            Object.entries(context.extra).forEach(([key, value]) => {
                scope.setExtra(key, value)
            })
        }

        Sentry.captureMessage(message, level)
    })
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, any>
) {
    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
        timestamp: Date.now() / 1000,
    })
}

/**
 * Start transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
    return Sentry.startTransaction({
        name,
        op,
    })
}

/**
 * Flush Sentry events (for graceful shutdown)
 */
export async function flushSentry() {
    await Sentry.close(2000)
}

export { Sentry }
