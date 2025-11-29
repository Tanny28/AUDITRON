import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const startReconciliationSchema = z.object({
    name: z.string(),
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
});

export async function reconciliationRoutes(fastify: FastifyInstance) {
    // Start reconciliation
    fastify.post('/start', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const body = startReconciliationSchema.parse(request.body);

            const reconciliation = await prisma.reconciliation.create({
                data: {
                    ...body,
                    status: 'PENDING',
                    organizationId: request.user.organizationId,
                },
            });

            // TODO: Queue reconciliation job with BullMQ
            // For now, return job created response

            return reply.send({
                message: 'Reconciliation job queued',
                reconciliationId: reconciliation.id,
                status: 'PENDING',
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });

    // Get reconciliation status
    fastify.get('/:id/status', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const reconciliation = await prisma.reconciliation.findFirst({
            where: {
                id,
                organizationId: request.user.organizationId,
            },
        });

        if (!reconciliation) {
            return reply.code(404).send({ error: 'Reconciliation not found' });
        }

        return reply.send({
            id: reconciliation.id,
            status: reconciliation.status,
            totalMatched: reconciliation.totalMatched,
            totalUnmatched: reconciliation.totalUnmatched,
            matchedAmount: reconciliation.matchedAmount,
            unmatchedAmount: reconciliation.unmatchedAmount,
            completedAt: reconciliation.completedAt,
        });
    });

    // Get reconciliation results
    fastify.get('/:id/results', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const reconciliation = await prisma.reconciliation.findFirst({
            where: {
                id,
                organizationId: request.user.organizationId,
            },
            include: {
                matches: {
                    include: {
                        transaction: true,
                        ledgerEntry: true,
                    },
                },
            },
        });

        if (!reconciliation) {
            return reply.code(404).send({ error: 'Reconciliation not found' });
        }

        return reply.send(reconciliation);
    });

    // List reconciliations
    fastify.get('/list', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const reconciliations = await prisma.reconciliation.findMany({
            where: {
                organizationId: request.user.organizationId,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return reply.send({ data: reconciliations });
    });
}
