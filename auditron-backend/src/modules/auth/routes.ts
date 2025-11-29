import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import { config } from '../../config';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    organizationName: z.string().min(1),
    organizationEmail: z.string().email(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
    // Register
    fastify.post('/register', async (request, reply) => {
        try {
            const body = registerSchema.parse(request.body);

            // Check if user exists
            const existingUser = await prisma.user.findUnique({
                where: { email: body.email },
            });

            if (existingUser) {
                return reply.code(400).send({ error: 'User already exists' });
            }

            // Create organization and user
            const passwordHash = await hashPassword(body.password);

            const organization = await prisma.organization.create({
                data: {
                    name: body.organizationName,
                    email: body.organizationEmail,
                    users: {
                        create: {
                            email: body.email,
                            passwordHash,
                            firstName: body.firstName,
                            lastName: body.lastName,
                            role: 'ADMIN', // First user is admin
                            emailVerified: false,
                        },
                    },
                },
                include: {
                    users: true,
                },
            });

            const user = organization.users[0];

            // Generate JWT
            const token = fastify.jwt.sign({
                id: user.id,
                email: user.email,
                role: user.role,
                organizationId: organization.id,
            });

            return reply.send({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    organizationId: organization.id,
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });

    // Login
    fastify.post('/login', async (request, reply) => {
        try {
            const body = loginSchema.parse(request.body);

            // Find user
            const user = await prisma.user.findUnique({
                where: { email: body.email },
                include: { organization: true },
            });

            if (!user) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            // Verify password
            const isValid = await verifyPassword(body.password, user.passwordHash);

            if (!isValid) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            if (!user.isActive) {
                return reply.code(403).send({ error: 'Account is deactivated' });
            }

            // Update last login
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });

            // Create audit log
            await prisma.auditLog.create({
                data: {
                    action: 'LOGIN',
                    userId: user.id,
                    organizationId: user.organizationId,
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                },
            });

            // Generate JWT
            const token = fastify.jwt.sign({
                id: user.id,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            });

            return reply.send({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    organizationId: user.organizationId,
                    organization: {
                        id: user.organization.id,
                        name: user.organization.name,
                        subscriptionTier: user.organization.subscriptionTier,
                    },
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });

    // Get current user
    fastify.get('/me', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({
            where: { id: request.user.id },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        subscriptionTier: true,
                        subscriptionEndsAt: true,
                    },
                },
            },
        });

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        return reply.send({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: user.organizationId,
            organization: user.organization,
        });
    });
}
