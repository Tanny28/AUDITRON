import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { billingService } from '../services/BillingService'
import { AgentLogger } from '../services/AgentLogger'

const logger = new AgentLogger('StripeWebhook')

/**
 * Stripe webhook handler
 * 
 * Handles:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_failed
 */
export async function stripeWebhookRoutes(fastify: FastifyInstance) {
    fastify.post(
        '/webhooks/stripe',
        {
            config: {
                // Disable body parsing to get raw body for signature verification
                rawBody: true,
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const signature = request.headers['stripe-signature'] as string

            if (!signature) {
                return reply.code(400).send({ error: 'Missing stripe-signature header' })
            }

            let event: Stripe.Event

            try {
                // Verify webhook signature
                event = billingService.verifyWebhookSignature(
                    request.rawBody || request.body as any,
                    signature
                )
            } catch (error: any) {
                logger.error('Webhook signature verification failed', { error: error.message })
                return reply.code(400).send({ error: 'Invalid signature' })
            }

            logger.info('Webhook received', { type: event.type, id: event.id })

            try {
                switch (event.type) {
                    case 'checkout.session.completed':
                        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
                        break

                    case 'customer.subscription.created':
                        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
                        break

                    case 'customer.subscription.updated':
                        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
                        break

                    case 'customer.subscription.deleted':
                        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
                        break

                    case 'invoice.payment_failed':
                        await handlePaymentFailed(event.data.object as Stripe.Invoice)
                        break

                    default:
                        logger.info('Unhandled webhook event', { type: event.type })
                }

                return reply.send({ received: true })
            } catch (error: any) {
                logger.error('Webhook handler error', {
                    type: event.type,
                    error: error.message,
                })
                return reply.code(500).send({ error: 'Webhook handler failed' })
            }
        }
    )
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    logger.info('Checkout completed', {
        sessionId: session.id,
        customerId: session.customer,
    })

    if (session.subscription) {
        await billingService.attachSubscriptionToOrg(
            session.customer as string,
            session.subscription as string
        )
    }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    logger.info('Subscription created', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
    })

    await billingService.attachSubscriptionToOrg(
        subscription.customer as string,
        subscription.id
    )
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    logger.info('Subscription updated', {
        subscriptionId: subscription.id,
        status: subscription.status,
    })

    await billingService.handleSubscriptionUpdated(subscription)
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    logger.info('Subscription deleted', {
        subscriptionId: subscription.id,
    })

    await billingService.handleSubscriptionDeleted(subscription)
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    logger.warn('Payment failed', {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_due,
    })

    // TODO: Send email notification to customer
    // TODO: Update organization status if payment fails multiple times
}
