import { FastifyRequest, FastifyReply } from 'fastify'
import { z, ZodError, ZodSchema } from 'zod'

/**
 * Validation middleware factory
 * Validates request body, query params, and params against Zod schemas
 */
export function validate(schemas: {
    body?: ZodSchema
    query?: ZodSchema
    params?: ZodSchema
}) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Validate body
            if (schemas.body) {
                request.body = schemas.body.parse(request.body)
            }

            // Validate query parameters
            if (schemas.query) {
                request.query = schemas.query.parse(request.query)
            }

            // Validate route parameters
            if (schemas.params) {
                request.params = schemas.params.parse(request.params)
            }
        } catch (error) {
            if (error instanceof ZodError) {
                return reply.code(400).send({
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code,
                    })),
                })
            }

            throw error
        }
    }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
    // Pagination
    pagination: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    }),

    // ID parameter
    id: z.object({
        id: z.string().min(1),
    }),

    // Email
    email: z.string().email().toLowerCase(),

    // Password (min 8 chars, at least one letter and one number)
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),

    // Phone number (international format)
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),

    // Date (ISO 8601)
    isoDate: z.string().datetime(),

    // Amount (positive number with max 2 decimal places)
    amount: z.number().positive().multipleOf(0.01),

    // Organization ID
    orgId: z.string().min(1),

    // User ID
    userId: z.string().min(1),
}

/**
 * Auth validation schemas
 */
export const authSchemas = {
    register: z.object({
        email: commonSchemas.email,
        password: commonSchemas.password,
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        organizationName: z.string().min(1).max(100).optional(),
    }),

    login: z.object({
        email: commonSchemas.email,
        password: z.string().min(1),
    }),

    changePassword: z.object({
        currentPassword: z.string().min(1),
        newPassword: commonSchemas.password,
    }),
}

/**
 * Invoice validation schemas
 */
export const invoiceSchemas = {
    create: z.object({
        vendorName: z.string().min(1).max(200),
        invoiceNumber: z.string().min(1).max(100).optional(),
        amount: commonSchemas.amount,
        invoiceDate: commonSchemas.isoDate,
        dueDate: commonSchemas.isoDate.optional(),
        description: z.string().max(1000).optional(),
        category: z.string().max(100).optional(),
    }),

    update: z.object({
        vendorName: z.string().min(1).max(200).optional(),
        invoiceNumber: z.string().min(1).max(100).optional(),
        amount: commonSchemas.amount.optional(),
        invoiceDate: commonSchemas.isoDate.optional(),
        dueDate: commonSchemas.isoDate.optional(),
        description: z.string().max(1000).optional(),
        category: z.string().max(100).optional(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
    }),

    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
        startDate: commonSchemas.isoDate.optional(),
        endDate: commonSchemas.isoDate.optional(),
        vendorName: z.string().optional(),
    }),
}

/**
 * Transaction validation schemas
 */
export const transactionSchemas = {
    create: z.object({
        description: z.string().min(1).max(500),
        amount: commonSchemas.amount,
        transactionDate: commonSchemas.isoDate,
        category: z.string().max(100).optional(),
        type: z.enum(['DEBIT', 'CREDIT']),
        reference: z.string().max(200).optional(),
    }),

    query: commonSchemas.pagination.extend({
        type: z.enum(['DEBIT', 'CREDIT']).optional(),
        startDate: commonSchemas.isoDate.optional(),
        endDate: commonSchemas.isoDate.optional(),
        category: z.string().optional(),
    }),
}

/**
 * Organization validation schemas
 */
export const orgSchemas = {
    create: z.object({
        name: z.string().min(1).max(100),
        email: commonSchemas.email,
    }),

    invite: z.object({
        email: commonSchemas.email,
        role: z.enum(['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER']),
    }),

    updateRole: z.object({
        role: z.enum(['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER']),
    }),
}

/**
 * Settings validation schemas
 */
export const settingsSchemas = {
    updateProfile: z.object({
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        phone: commonSchemas.phone.optional(),
        timezone: z.string().max(50).optional(),
    }),

    updateNotifications: z.object({
        emailAlerts: z.boolean().optional(),
        jobAlerts: z.boolean().optional(),
        anomalyAlerts: z.boolean().optional(),
        weeklyReports: z.boolean().optional(),
    }),

    uploadProfilePicture: z.object({
        url: z.string().url(),
    }),
}

/**
 * API Key validation schemas
 */
export const apiKeySchemas = {
    generate: z.object({
        name: z.string().min(1).max(100).optional(),
    }),
}

/**
 * Billing validation schemas
 */
export const billingSchemas = {
    createCheckout: z.object({
        planId: z.enum(['starter', 'pro', 'enterprise']),
    }),
}

/**
 * File upload validation
 */
export const fileUploadSchemas = {
    // Max file size: 10MB
    maxSize: 10 * 1024 * 1024,

    // Allowed MIME types
    allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],

    // Validate file upload
    validateFile: (file: { mimetype: string; size: number }) => {
        if (!fileUploadSchemas.allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(
                `Invalid file type. Allowed types: ${fileUploadSchemas.allowedMimeTypes.join(', ')}`
            )
        }

        if (file.size > fileUploadSchemas.maxSize) {
            throw new Error(`File size exceeds maximum of ${fileUploadSchemas.maxSize / 1024 / 1024}MB`)
        }

        return true
    },
}

/**
 * Sanitization helpers
 */
export const sanitize = {
    // Remove HTML tags
    stripHtml: (str: string): string => {
        return str.replace(/<[^>]*>/g, '')
    },

    // Escape HTML entities
    escapeHtml: (str: string): string => {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
        }
        return str.replace(/[&<>"'/]/g, (char) => map[char])
    },

    // Trim and normalize whitespace
    normalizeWhitespace: (str: string): string => {
        return str.trim().replace(/\s+/g, ' ')
    },
}
