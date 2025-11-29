import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const createTransactionSchema = z.object({
    transactionDate: z.string().transform((str) => new Date(str)),
    description: z.string(),
    amount: z.number(),
    type: z.enum(['DEBIT', 'CREDIT']),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    gstRate: z.number().optional(),
    gstAmount: z.number().optional(),
    bankReference: z.string().optional(),
    notes: z.string().optional(),
    invoiceId: z.string().optional(),
});

const listTransactionsSchema = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('50'),
    startDate: z.string().transform((str) => new Date(str)).optional(),
    endDate: z.string().transform((str) => new Date(str)).optional(),
    category: z.string().optional(),
    isReconciled: z.string().transform((str) => str === 'true').optional(),
});

export async function transactionRoutes(fastify: FastifyInstance) {
    // Create transaction
    fastify.post('/', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const body = createTransactionSchema.parse(request.body);

            const transaction = await prisma.transaction.create({
                data: {
                    ...body,
                    organizationId: request.user.organizationId,
                },
            });

            // Audit log
            await prisma.auditLog.create({
                data: {
                    action: 'CREATE_TRANSACTION',
                    entityType: 'Transaction',
                    entityId: transaction.id,
                    userId: request.user.id,
                    organizationId: request.user.organizationId,
                },
            });

            return reply.send(transaction);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });

    // List transactions
    fastify.get('/', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const query = listTransactionsSchema.parse(request.query);
            const skip = (query.page - 1) * query.limit;

            const where: any = {
                organizationId: request.user.organizationId,
            };

            if (query.startDate || query.endDate) {
                where.transactionDate = {};
                if (query.startDate) where.transactionDate.gte = query.startDate;
                if (query.endDate) where.transactionDate.lte = query.endDate;
            }

            if (query.category) where.category = query.category;
            if (query.isReconciled !== undefined) where.isReconciled = query.isReconciled;

            const [transactions, total] = await Promise.all([
                prisma.transaction.findMany({
                    where,
                    skip,
                    take: query.limit,
                    orderBy: { transactionDate: 'desc' },
                    include: {
                        invoice: {
                            select: {
                                invoiceNumber: true,
                                vendorName: true,
                            },
                        },
                    },
                }),
                prisma.transaction.count({ where }),
            ]);

            return reply.send({
                data: transactions,
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    total,
                    totalPages: Math.ceil(total / query.limit),
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });

    // Get transaction by ID
    fastify.get('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const transaction = await prisma.transaction.findFirst({
            where: {
                id,
                organizationId: request.user.organizationId,
            },
            include: {
                invoice: true,
                ledgerEntry: true,
            },
        });

        if (!transaction) {
            return reply.code(404).send({ error: 'Transaction not found' });
        }

        return reply.send(transaction);
    });

    // Update transaction
    fastify.patch('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const body = createTransactionSchema.partial().parse(request.body);

            const transaction = await prisma.transaction.updateMany({
                where: {
                    id,
                    organizationId: request.user.organizationId,
                },
                data: body,
            });

            if (transaction.count === 0) {
                return reply.code(404).send({ error: 'Transaction not found' });
            }

            // Audit log
            await prisma.auditLog.create({
                data: {
                    action: 'UPDATE_TRANSACTION',
                    entityType: 'Transaction',
                    entityId: id,
                    changes: body,
                    userId: request.user.id,
                    organizationId: request.user.organizationId,
                },
            });

            return reply.send({ message: 'Transaction updated' });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            throw error;
        }
    });

    // Delete transaction
    fastify.delete('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const transaction = await prisma.transaction.deleteMany({
            where: {
                id,
                organizationId: request.user.organizationId,
            },
        });

        if (transaction.count === 0) {
            return reply.code(404).send({ error: 'Transaction not found' });
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'DELETE_TRANSACTION',
                entityType: 'Transaction',
                entityId: id,
                userId: request.user.id,
                organizationId: request.user.organizationId,
            },
        });

        return reply.send({ message: 'Transaction deleted' });
    });
}
