import pino from 'pino'
import { config } from '../config'

/**
 * Enhanced logging configuration
 */
const loggerConfig: pino.LoggerOptions = {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',

    // Pretty print in development
    transport:
        config.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                    singleLine: false,
                },
            }
            : undefined,

    // Structured logging in production
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() }
        },
        bindings: (bindings) => {
            return {
                pid: bindings.pid,
                hostname: bindings.hostname,
                node_version: process.version,
            }
        },
    },

    // Redact sensitive fields
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.apiKey',
            'res.headers["set-cookie"]',
        ],
        remove: true,
    },

    // Serializers for common objects
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            headers: req.headers,
            remoteAddress: req.ip,
            remotePort: req.socket?.remotePort,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
            headers: res.getHeaders?.(),
        }),
        err: pino.stdSerializers.err,
    },

    // Base fields
    base: {
        env: config.NODE_ENV,
        service: 'auditron-api',
        version: process.env.npm_package_version || '1.0.0',
    },
}

/**
 * Create logger instance
 */
export const logger = pino(loggerConfig)

/**
 * Create child logger with context
 */
export function createLogger(context: Record<string, any>) {
    return logger.child(context)
}

/**
 * Request logger middleware
 * Adds request ID and logs request/response
 */
export function requestLogger() {
    return {
        logger,
        genReqId: (req: any) => {
            // Use existing request ID or generate new one
            return req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        serializers: {
            req: (req: any) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                path: req.routeOptions?.url,
                params: req.params,
                query: req.query,
                headers: {
                    host: req.headers.host,
                    'user-agent': req.headers['user-agent'],
                    'content-type': req.headers['content-type'],
                },
                remoteAddress: req.ip,
                user: req.user
                    ? {
                        id: req.user.id,
                        email: req.user.email,
                        orgId: req.user.orgId,
                    }
                    : undefined,
            }),
            res: (res: any) => ({
                statusCode: res.statusCode,
                responseTime: res.getResponseTime?.(),
            }),
        },
    }
}

/**
 * Log levels helper
 */
export const LogLevel = {
    FATAL: 'fatal',
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
    TRACE: 'trace',
} as const

/**
 * Structured logging helpers
 */
export const log = {
    // Security events
    security: (event: string, details: Record<string, any>) => {
        logger.warn({ event, category: 'security', ...details }, `Security event: ${event}`)
    },

    // Audit events
    audit: (action: string, details: Record<string, any>) => {
        logger.info({ action, category: 'audit', ...details }, `Audit: ${action}`)
    },

    // Performance events
    performance: (operation: string, duration: number, details?: Record<string, any>) => {
        logger.info(
            { operation, duration, category: 'performance', ...details },
            `Performance: ${operation} took ${duration}ms`
        )
    },

    // Business events
    business: (event: string, details: Record<string, any>) => {
        logger.info({ event, category: 'business', ...details }, `Business event: ${event}`)
    },

    // Integration events
    integration: (service: string, action: string, details?: Record<string, any>) => {
        logger.info(
            { service, action, category: 'integration', ...details },
            `Integration: ${service} - ${action}`
        )
    },
}

/**
 * Log rotation configuration (for production)
 * 
 * When deploying, use pino-rotating-file-stream:
 * 
 * ```typescript
 * import { createStream } from 'rotating-file-stream'
 * 
 * const stream = createStream('auditron.log', {
 *   interval: '1d', // Rotate daily
 *   path: '/var/log/auditron',
 *   size: '100M', // Max file size
 *   compress: 'gzip',
 * })
 * 
 * const logger = pino(loggerConfig, stream)
 * ```
 */
