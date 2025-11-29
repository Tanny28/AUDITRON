import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const generateReportSchema = z.object({
    type: z.enum(['PROFIT_LOSS', 'BALANCE_SHEET', 'GST', 'TAX', 'CASH_FLOW']),
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
    name: z.string().optional(),
});

export async function reportRoutes(fastify: FastifyInstance) {
    // Generate report
    fastify.post('/generate', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const body = generateReportSchema.parse(request.body);

            // TODO: Implement actual report generation logic
            // For now, create placeholder report

            const report = await prisma.report.create({
                data: {
                    name: body.name || `${body.type} Report`,
                    type: body.type,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    data: {}, // Placeholder
                    organizationId: request.user.organizationId,
                },
            });

            return reply.send(report);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });

    // Get P&L report
    fastify.get('/pnl', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

        if (!startDate || !endDate) {
            return reply.code(400).send({ error: 'startDate and endDate are required' });
        }

        // TODO: Implement P&L calculation
        return reply.send({
            type: 'PROFIT_LOSS',
            startDate,
            endDate,
            data: {
                revenue: 0,
                expenses: 0,
                netProfit: 0,
            },
        });
    });

    // Get Balance Sheet
    fastify.get('/balance-sheet', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { date } = request.query as { date?: string };

        if (!date) {
            return reply.code(400).send({ error: 'date is required' });
        }

        // TODO: Implement Balance Sheet calculation
        return reply.send({
            type: 'BALANCE_SHEET',
            date,
            data: {
                assets: 0,
                liabilities: 0,
                equity: 0,
            },
        });
    });

    // Get GST report
    fastify.get('/gst', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

        if (!startDate || !endDate) {
            return reply.code(400).send({ error: 'startDate and endDate are required' });
        }

        // TODO: Implement GST calculation
        return reply.send({
            type: 'GST',
            startDate,
            endDate,
            data: {
                totalGST: 0,
                cgst: 0,
                sgst: 0,
                igst: 0,
            },
        });
    });

    // List reports
    fastify.get('/list', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const reports = await prisma.report.findMany({
            where: {
                organizationId: request.user.organizationId,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return reply.send({ data: reports });
    });

    // Get report by ID
    fastify.get('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const report = await prisma.report.findFirst({
            where: {
                id,
                organizationId: request.user.organizationId,
            },
        });

        if (!report) {
            return reply.code(404).send({ error: 'Report not found' });
        }

        return reply.send(report);
    });
}
