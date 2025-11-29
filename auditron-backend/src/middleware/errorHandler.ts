import { FastifyRequest, FastifyReply } from 'fastify'
import { captureException } from '../services/ErrorTracker'

/**
 * Custom error classes
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public code?: string,
        public details?: any
    ) {
        super(message)
        this.name = 'AppError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(400, message, 'VALIDATION_ERROR', details)
        this.name = 'ValidationError'
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(401, message, 'AUTHENTICATION_ERROR')
        this.name = 'AuthenticationError'
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(403, message, 'AUTHORIZATION_ERROR')
        this.name = 'AuthorizationError'
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(404, `${resource} not found`, 'NOT_FOUND')
        this.name = 'NotFoundError'
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, message, 'CONFLICT')
        this.name = 'ConflictError'
    }
}

export class RateLimitError extends AppError {
    constructor(retryAfter: number) {
        super(429, 'Too many requests', 'RATE_LIMIT_EXCEEDED', { retryAfter })
        this.name = 'RateLimitError'
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(500, message, 'INTERNAL_SERVER_ERROR')
        this.name = 'InternalServerError'
    }
}

/**
 * Global error handler middleware
 */
export async function errorHandler(
    error: Error,
    request: FastifyRequest,
    reply: FastifyReply
) {
    // Log error
    request.log.error({
        err: error,
        req: {
            method: request.method,
            url: request.url,
            headers: request.headers,
            params: request.params,
            query: request.query,
        },
    })

    // Handle known error types
    if (error instanceof AppError) {
        return reply.code(error.statusCode).send({
            error: error.name,
            message: error.message,
            code: error.code,
            details: error.details,
        })
    }

    // Handle Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error as any

        if (prismaError.code === 'P2002') {
            return reply.code(409).send({
                error: 'Conflict',
                message: 'A record with this value already exists',
                code: 'DUPLICATE_ENTRY',
            })
        }

        if (prismaError.code === 'P2025') {
            return reply.code(404).send({
                error: 'Not Found',
                message: 'Record not found',
                code: 'NOT_FOUND',
            })
        }
    }

    // Handle validation errors (Zod)
    if (error.name === 'ZodError') {
        return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid request data',
            code: 'VALIDATION_ERROR',
        })
    }

    // Capture unknown errors in Sentry
    captureException(error, {
        user: request.user
            ? {
                id: request.user.id,
                email: request.user.email,
                orgId: request.user.orgId,
            }
            : undefined,
        tags: {
            method: request.method,
            url: request.url,
        },
        extra: {
            params: request.params,
            query: request.query,
            body: request.body,
        },
    })

    // Generic error response
    return reply.code(500).send({
        error: 'Internal Server Error',
        message:
            process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : error.message,
        code: 'INTERNAL_SERVER_ERROR',
    })
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
    handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>
) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            return await handler(request, reply)
        } catch (error) {
            return errorHandler(error as Error, request, reply)
        }
    }
}

/**
 * Not found handler
 */
export async function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
    return reply.code(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
        code: 'ROUTE_NOT_FOUND',
    })
}
