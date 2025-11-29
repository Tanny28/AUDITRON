import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';

const updateOrgSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
});

export async function orgRoutes(fastify: FastifyInstance) {
    // Get organization
    fastify.get('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        // Ensure user can only access their own org
        if (id !== request.user.organizationId && request.user.role !== 'ADMIN') {
            return reply.code(403).send({ error: 'Forbidden' });
        }

        const org = await prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                    },
                },
            },
        });

        if (!org) {
            return reply.code(404).send({ error: 'Organization not found' });
        }

        return reply.send(org);
    });

    // Update organization
    fastify.patch('/:id', {
        onRequest: [fastify.authenticate, requireRole('ADMIN')],
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const body = updateOrgSchema.parse(request.body);

            if (id !== request.user.organizationId) {
                return reply.code(403).send({ error: 'Forbidden' });
            }

            const org = await prisma.organization.update({
                where: { id },
                data: body,
            });

            // Audit log
            await prisma.auditLog.create({
                data: {
                    action: 'UPDATE_ORGANIZATION',
                    entityType: 'Organization',
                    entityId: id,
                    changes: body,
                    userId: request.user.id,
                    organizationId: id,
                },
            });

            return reply.send(org);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });
}
