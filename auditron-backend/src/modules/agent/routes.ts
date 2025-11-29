import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const runAgentSchema = z.object({
    type: z.enum(['OCR', 'CATEGORIZATION', 'RECONCILIATION', 'COMPLIANCE', 'REPORTING']),
    input: z.record(z.any()),
});

export async function agentRoutes(fastify: FastifyInstance) {
    // Run agent
    fastify.post('/run', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const body = runAgentSchema.parse(request.body);

            const agentJob = await prisma.agentJob.create({
                data: {
                    type: body.type,
                    status: 'QUEUED',
                    input: body.input,
                    organizationId: request.user.organizationId,
                    triggeredById: request.user.id,
                },
            });

            // TODO: Queue agent job with BullMQ

            return reply.send({
                jobId: agentJob.id,
                status: 'QUEUED',
                type: body.type,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });

    // Get agent job status
    fastify.get('/status/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const job = await prisma.agentJob.findFirst({
            where: {
                id,
                organizationId: request.user.organizationId,
            },
        });

        if (!job) {
            return reply.code(404).send({ error: 'Agent job not found' });
        }

        return reply.send({
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            output: job.output,
            error: job.error,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
        });
    });

    // List agent jobs
    fastify.get('/list', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const jobs = await prisma.agentJob.findMany({
            where: {
                organizationId: request.user.organizationId,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return reply.send({ data: jobs });
    });
}
