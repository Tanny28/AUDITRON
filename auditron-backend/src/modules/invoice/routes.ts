import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { minioClient } from '../../lib/minio';
import { config } from '../../config';
import { randomUUID } from 'crypto';

const listInvoicesSchema = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    status: z.enum(['UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
});

export async function invoiceRoutes(fastify: FastifyInstance) {
    // Upload invoice
    fastify.post('/upload', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            const buffer = await data.toBuffer();
            const fileId = randomUUID();
            const fileExt = data.filename.split('.').pop();
            const objectName = `invoices/${request.user.organizationId}/${fileId}.${fileExt}`;

            // Upload to MinIO
            await minioClient.putObject(
                config.MINIO_BUCKET,
                objectName,
                buffer,
                buffer.length,
                {
                    'Content-Type': data.mimetype,
                }
            );

            // Create invoice record
            const invoice = await prisma.invoice.create({
                data: {
                    invoiceNumber: `INV-${Date.now()}`,
                    fileUrl: objectName,
                    fileName: data.filename,
                    fileSize: buffer.length,
                    mimeType: data.mimetype,
                    status: 'UPLOADED',
                    organizationId: request.user.organizationId,
                    uploadedById: request.user.id,
                },
            });

            // Audit log
            await prisma.auditLog.create({
                data: {
                    action: 'UPLOAD_INVOICE',
                    entityType: 'Invoice',
                    entityId: invoice.id,
                    userId: request.user.id,
                    organizationId: request.user.organizationId,
                },
            });

            return reply.send(invoice);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to upload invoice' });
        }
    });

    // List invoices
    fastify.get('/list', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const query = listInvoicesSchema.parse(request.query);
            const skip = (query.page - 1) * query.limit;

            const where = {
                organizationId: request.user.organizationId,
                ...(query.status && { status: query.status }),
            };

            const [invoices, total] = await Promise.all([
                prisma.invoice.findMany({
                    where,
                    skip,
                    take: query.limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        uploadedBy: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                }),
                prisma.invoice.count({ where }),
            ]);

            return reply.send({
                data: invoices,
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

    // Get invoice by ID
    fastify.get('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const invoice = await prisma.invoice.findFirst({
            where: {
                id,
                organizationId: request.user.organizationId,
            },
            include: {
                uploadedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                transactions: true,
            },
        });

        if (!invoice) {
            return reply.code(404).send({ error: 'Invoice not found' });
        }

        return reply.send(invoice);
    });

    // Start OCR processing
    fastify.post('/:id/ocr', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const invoice = await prisma.invoice.findFirst({
            where: {
                id,
                organizationId: request.user.organizationId,
            },
        });

        if (!invoice) {
            return reply.code(404).send({ error: 'Invoice not found' });
        }

        // Update status to processing
        await prisma.invoice.update({
            where: { id },
            data: { status: 'PROCESSING' },
        });

        // TODO: Queue OCR job with BullMQ
        // For now, return job queued response

        return reply.send({
            message: 'OCR job queued',
            invoiceId: id,
            status: 'PROCESSING',
        });
    });
}
