import Stripe from 'stripe'
import { config } from '../config'
import { prisma } from '../lib/prisma'
import { AgentLogger } from './AgentLogger'

const logger = new AgentLogger('BillingService')

/**
 * BillingService - Stripe integration for subscription management
 */
export class BillingService {
    private stripe: Stripe

    constructor() {
        this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
        })
    }

    /**
     * Create Stripe checkout session
     */
    async createCheckoutSession(
        orgId: string,
        planId: string,
        userId: string
    ): Promise<{ sessionId: string; url: string }> {
        try {
            const org = await prisma.organization.findUnique({
                where: { id: orgId },
            })

            if (!org) {
                throw new Error('Organization not found')
            }

            // Get or create Stripe customer
            let customerId = org.stripeCustomerId

            if (!customerId) {
                const customer = await this.stripe.customers.create({
                    email: org.email,
                    name: org.name,
                    metadata: {
                        orgId,
                    },
                })
                customerId = customer.id

                await prisma.organization.update({
                    where: { id: orgId },
                    data: { stripeCustomerId: customerId },
                })
            }

            // Get price ID for plan
            const priceId = this.getPriceIdForPlan(planId)

            // Create checkout session
            const session = await this.stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                success_url: `${config.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${config.APP_URL}/billing/cancel`,
                metadata: {
                    orgId,
                    userId,
                    planId,
                },
            })

            logger.info('Checkout session created', {
                orgId,
                sessionId: session.id,
                planId,
            })

            return {
                sessionId: session.id,
                url: session.url!,
            }
        } catch (error: any) {
            logger.error('Failed to create checkout session', { error: error.message })
            throw error
        }
    }

    /**
     * Create Stripe customer portal session
     */
    async createPortalSession(orgId: string): Promise<{ url: string }> {
        try {
            const org = await prisma.organization.findUnique({
                where: { id: orgId },
            })

            if (!org || !org.stripeCustomerId) {
                throw new Error('No Stripe customer found for organization')
            }

            const session = await this.stripe.billingPortal.sessions.create({
                customer: org.stripeCustomerId,
                return_url: `${config.APP_URL}/settings/billing`,
            })

            logger.info('Portal session created', { orgId })

            return { url: session.url }
        } catch (error: any) {
            logger.error('Failed to create portal session', { error: error.message })
            throw error
        }
    }

    /**
     * Attach subscription to organization
     */
    async attachSubscriptionToOrg(
        customerId: string,
        subscriptionId: string
    ): Promise<void> {
        try {
            const org = await prisma.organization.findFirst({
                where: { stripeCustomerId: customerId },
            })

            if (!org) {
                throw new Error('Organization not found for customer')
            }

            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)

            await prisma.organization.update({
                where: { id: org.id },
                data: {
                    stripeSubscriptionId: subscriptionId,
                    subscriptionStatus: subscription.status,
                    subscriptionPlan: this.getPlanFromPriceId(subscription.items.data[0].price.id),
                    subscriptionEndsAt: subscription.current_period_end
                        ? new Date(subscription.current_period_end * 1000)
                        : null,
                },
            })

            logger.info('Subscription attached to org', {
                orgId: org.id,
                subscriptionId,
            })
        } catch (error: any) {
            logger.error('Failed to attach subscription', { error: error.message })
            throw error
        }
    }

    /**
     * Handle subscription updated event
     */
    async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        try {
            const org = await prisma.organization.findFirst({
                where: { stripeCustomerId: subscription.customer as string },
            })

            if (!org) {
                logger.warn('Organization not found for subscription update', {
                    customerId: subscription.customer,
                })
                return
            }

            await prisma.organization.update({
                where: { id: org.id },
                data: {
                    subscriptionStatus: subscription.status,
                    subscriptionEndsAt: subscription.current_period_end
                        ? new Date(subscription.current_period_end * 1000)
                        : null,
                },
            })

            logger.info('Subscription updated', {
                orgId: org.id,
                status: subscription.status,
            })
        } catch (error: any) {
            logger.error('Failed to handle subscription update', { error: error.message })
            throw error
        }
    }

    /**
     * Handle subscription deleted event
     */
    async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        try {
            const org = await prisma.organization.findFirst({
                where: { stripeCustomerId: subscription.customer as string },
            })

            if (!org) {
                return
            }

            await prisma.organization.update({
                where: { id: org.id },
                data: {
                    subscriptionStatus: 'canceled',
                    subscriptionEndsAt: new Date(),
                },
            })

            logger.info('Subscription deleted', { orgId: org.id })
        } catch (error: any) {
            logger.error('Failed to handle subscription deletion', { error: error.message })
            throw error
        }
    }

    /**
     * Get billing status for organization
     */
    async getBillingStatus(orgId: string): Promise<{
        plan: string
        status: string
        currentPeriodEnd: Date | null
        cancelAtPeriodEnd: boolean
    }> {
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
        })

        if (!org) {
            throw new Error('Organization not found')
        }

        let cancelAtPeriodEnd = false

        if (org.stripeSubscriptionId) {
            try {
                const subscription = await this.stripe.subscriptions.retrieve(
                    org.stripeSubscriptionId
                )
                cancelAtPeriodEnd = subscription.cancel_at_period_end
            } catch (error) {
                logger.warn('Failed to retrieve subscription', { error })
            }
        }

        return {
            plan: org.subscriptionPlan || 'free',
            status: org.subscriptionStatus || 'inactive',
            currentPeriodEnd: org.subscriptionEndsAt,
            cancelAtPeriodEnd,
        }
    }

    /**
     * Get price ID for plan
     */
    private getPriceIdForPlan(planId: string): string {
        // TODO: Replace with actual Stripe price IDs from dashboard
        const priceMap: Record<string, string> = {
            starter: config.STRIPE_PRICE_STARTER || 'price_starter',
            pro: config.STRIPE_PRICE_PRO || 'price_pro',
            enterprise: config.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
        }

        return priceMap[planId] || priceMap.starter
    }

    /**
     * Get plan name from price ID
     */
    private getPlanFromPriceId(priceId: string): string {
        // TODO: Map price IDs back to plan names
        if (priceId.includes('enterprise')) return 'enterprise'
        if (priceId.includes('pro')) return 'pro'
        return 'starter'
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
        return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            config.STRIPE_WEBHOOK_SECRET
        )
    }
}

export const billingService = new BillingService()
