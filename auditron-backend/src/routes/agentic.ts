import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { addAgenticJob } from '../queue/agenticQueue'
import { AgentLogger } from '../services/AgentLogger'

const logger = new AgentLogger('AgenticRoutes')

export async function agenticRoutes(fastify: FastifyInstance) {
    /**
     * POST /agentic/invoice/start
     * Start invoice processing workflow
     */
    fastify.post(
        '/agentic/invoice/start',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { invoiceId } = request.body as { invoiceId: string }

            if (!invoiceId) {
                return reply.code(400).send({ error: 'invoiceId is required' })
            }

            try {
                // Verify invoice exists
                const invoice = await prisma.invoice.findUnique({
                    where: { id: invoiceId },
                })

                if (!invoice) {
                    return reply.code(404).send({ error: 'Invoice not found' })
                }

                // Create agent job
                const job = await prisma.agentJob.create({
                    data: {
                        type: 'invoice-processing',
                        status: 'QUEUED',
                        orgId: invoice.orgId,
                        userId: request.user.id,
                        payload: { invoiceId },
                        progress: 0,
                    },
                })

                // Add to queue
                await addAgenticJob('invoice-processing', { jobId: job.id })

                logger.info('Invoice processing started', {
                    jobId: job.id,
                    invoiceId,
                })

                return reply.send({
                    message: 'Invoice processing started',
                    jobId: job.id,
                    status: 'QUEUED',
                })
            } catch (error: any) {
                logger.error('Failed to start invoice processing', { error: error.message })
                return reply.code(500).send({ error: 'Failed to start processing' })
            }
        }
    )

    /**
     * POST /agentic/reconcile/start
     * Start reconciliation workflow
     */
    fastify.post(
        '/agentic/reconcile/start',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { name, startDate, endDate } = request.body as {
                name: string
                startDate: string
                endDate: string
            }

            if (!name || !startDate || !endDate) {
                return reply.code(400).send({ error: 'name, startDate, and endDate are required' })
            }

            try {
                // Create reconciliation record
                const reconciliation = await prisma.reconciliation.create({
                    data: {
                        name,
                        orgId: request.user.orgId,
                        startDate: new Date(startDate),
                        endDate: new Date(endDate),
                        status: 'PENDING',
                    },
                })

                // Create agent job
                const job = await prisma.agentJob.create({
                    data: {
                        type: 'reconciliation-processing',
                        status: 'QUEUED',
                        orgId: request.user.orgId,
                        userId: request.user.id,
                        payload: { reconciliationId: reconciliation.id },
                        progress: 0,
                    },
                })

                // Add to queue
                await addAgenticJob('reconciliation-processing', { jobId: job.id })

                logger.info('Reconciliation started', {
                    jobId: job.id,
                    reconciliationId: reconciliation.id,
                })

                return reply.send({
                    message: 'Reconciliation started',
                    reconciliationId: reconciliation.id,
                    jobId: job.id,
                    status: 'QUEUED',
                })
            } catch (error: any) {
                logger.error('Failed to start reconciliation', { error: error.message })
                return reply.code(500).send({ error: 'Failed to start reconciliation' })
            }
        }
    )

    /**
     * POST /agentic/gst/start
     * Start GST processing workflow
     */
    fastify.post(
        '/agentic/gst/start',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { invoiceId, transactionIds } = request.body as {
                invoiceId?: string
                transactionIds?: string[]
            }

            if (!invoiceId && !transactionIds) {
                return reply.code(400).send({ error: 'invoiceId or transactionIds required' })
            }

            try {
                // Create agent job
                const job = await prisma.agentJob.create({
                    data: {
                        type: 'gst-processing',
                        status: 'QUEUED',
                        orgId: request.user.orgId,
                        userId: request.user.id,
                        payload: { invoiceId, transactionIds },
                        progress: 0,
                    },
                })

                // Add to queue
                await addAgenticJob('gst-processing', { jobId: job.id })

                logger.info('GST processing started', { jobId: job.id })

                return reply.send({
                    message: 'GST processing started',
                    jobId: job.id,
                    status: 'QUEUED',
                })
            } catch (error: any) {
                logger.error('Failed to start GST processing', { error: error.message })
                return reply.code(500).send({ error: 'Failed to start processing' })
            }
        }
    )

    /**
     * GET /agentic/status/:jobId
     * Get job status and progress
     */
    fastify.get(
        '/agentic/status/:jobId',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { jobId } = request.params as { jobId: string }

            try {
                const job = await prisma.agentJob.findUnique({
                    where: { id: jobId },
                })

                if (!job) {
                    return reply.code(404).send({ error: 'Job not found' })
                }

                // Verify user has access
                if (job.orgId !== request.user.orgId && request.user.role !== 'ADMIN') {
                    return reply.code(403).send({ error: 'Access denied' })
                }

                return reply.send({
                    id: job.id,
                    type: job.type,
                    status: job.status,
                    progress: job.progress,
                    output: job.output,
                    error: job.error,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                    createdAt: job.createdAt,
                })
            } catch (error: any) {
                logger.error('Failed to get job status', { error: error.message })
                return reply.code(500).send({ error: 'Failed to get status' })
            }
        }
    )

    /**
     * GET /agentic/logs/:jobId
     * Get job logs
     */
    fastify.get(
        '/agentic/logs/:jobId',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { jobId } = request.params as { jobId: string }

            try {
                const job = await prisma.agentJob.findUnique({
                    where: { id: jobId },
                })

                if (!job) {
                    return reply.code(404).send({ error: 'Job not found' })
                }

                // Verify user has access
                if (job.orgId !== request.user.orgId && request.user.role !== 'ADMIN') {
                    return reply.code(403).send({ error: 'Access denied' })
                }

                // TODO: Fetch logs from AgentLogger
                // const logs = await AgentLogger.getJobLogs(jobId)

                return reply.send({
                    jobId,
                    logs: job.logs || [],
                })
            } catch (error: any) {
                logger.error('Failed to get job logs', { error: error.message })
                return reply.code(500).send({ error: 'Failed to get logs' })
            }
        }
    )

    /**
     * GET /agentic/list
     * List all jobs for organization
     */
    fastify.get(
        '/agentic/list',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { page = 1, limit = 20, status } = request.query as {
                page?: number
                limit?: number
                status?: string
            }

            try {
                const where: any = {
                    orgId: request.user.orgId,
                }

                if (status) {
                    where.status = status
                }

                const [jobs, total] = await Promise.all([
                    prisma.agentJob.findMany({
                        where,
                        orderBy: { createdAt: 'desc' },
                        skip: (page - 1) * limit,
                        take: limit,
                    }),
                    prisma.agentJob.count({ where }),
                ])

                return reply.send({
                    data: jobs,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                })
            } catch (error: any) {
                logger.error('Failed to list jobs', { error: error.message })
                return reply.code(500).send({ error: 'Failed to list jobs' })
            }
        }
    )
}
