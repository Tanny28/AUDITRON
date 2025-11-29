import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { billingService } from '../services/BillingService'
import { AgentLogger } from '../services/AgentLogger'

const logger = new AgentLogger('BillingRoutes')

export async function billingRoutes(fastify: FastifyInstance) {
    /**
     * POST /billing/checkout
     * Create Stripe checkout session
     */
    fastify.post(
        '/billing/checkout',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { planId } = request.body as { planId: string }

            if (!planId) {
                return reply.code(400).send({ error: 'planId is required' })
            }

            try {
                const session = await billingService.createCheckoutSession(
                    request.user.orgId,
                    planId,
                    request.user.id
                )

                return reply.send({
                    sessionId: session.sessionId,
                    url: session.url,
                })
            } catch (error: any) {
                logger.error('Failed to create checkout session', { error: error.message })
                return reply.code(500).send({ error: 'Failed to create checkout session' })
            }
        }
    )

    /**
     * POST /billing/portal
     * Create Stripe customer portal session
     */
    fastify.post(
        '/billing/portal',
        { preHandler: [authenticate] },
        async (request, reply) => {
            try {
                const session = await billingService.createPortalSession(request.user.orgId)

                return reply.send({ url: session.url })
            } catch (error: any) {
                logger.error('Failed to create portal session', { error: error.message })
                return reply.code(500).send({ error: 'Failed to create portal session' })
            }
        }
    )

    /**
     * GET /billing/status/:orgId
     * Get billing status for organization
     */
    fastify.get(
        '/billing/status/:orgId',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { orgId } = request.params as { orgId: string }

            // Verify user has access to this org
            if (request.user.orgId !== orgId && request.user.role !== 'ADMIN') {
                return reply.code(403).send({ error: 'Access denied' })
            }

            try {
                const status = await billingService.getBillingStatus(orgId)

                return reply.send(status)
            } catch (error: any) {
                logger.error('Failed to get billing status', { error: error.message })
                return reply.code(500).send({ error: 'Failed to get billing status' })
            }
        }
    )

    /**
     * GET /billing/plans
     * Get available subscription plans
     */
    fastify.get('/billing/plans', async (request, reply) => {
        return reply.send({
            plans: [
                {
                    id: 'starter',
                    name: 'AUDITRON Starter',
                    price: 999,
                    currency: 'INR',
                    interval: 'month',
                    features: [
                        '100 invoices/month',
                        'Basic OCR',
                        'Email support',
                        '1 user',
                    ],
                },
                {
                    id: 'pro',
                    name: 'AUDITRON Pro',
                    price: 4999,
                    currency: 'INR',
                    interval: 'month',
                    features: [
                        'Unlimited invoices',
                        'Advanced OCR + AI validation',
                        'Auto-reconciliation',
                        'Priority support',
                        '5 users',
                        'GST reports',
                    ],
                    popular: true,
                },
                {
                    id: 'enterprise',
                    name: 'AUDITRON Enterprise',
                    price: null,
                    currency: 'INR',
                    interval: 'month',
                    features: [
                        'Everything in Pro',
                        'Unlimited users',
                        'Custom integrations',
                        'Dedicated support',
                        'SLA guarantee',
                        'On-premise deployment option',
                    ],
                    contactSales: true,
                },
            ],
        })
    })
}
