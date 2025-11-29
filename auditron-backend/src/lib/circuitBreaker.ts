import { logger } from '../lib/logger'

/**
 * Circuit Breaker States
 */
enum CircuitState {
    CLOSED = 'CLOSED', // Normal operation
    OPEN = 'OPEN', // Circuit is open, requests fail fast
    HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit Breaker Options
 */
interface CircuitBreakerOptions {
    failureThreshold: number // Number of failures before opening circuit
    successThreshold: number // Number of successes to close circuit from half-open
    timeout: number // Time in ms before attempting to close circuit
    resetTimeout: number // Time in ms to wait before transitioning from open to half-open
}

/**
 * Circuit Breaker
 * Prevents cascading failures by failing fast when a service is down
 */
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED
    private failureCount: number = 0
    private successCount: number = 0
    private nextAttempt: number = Date.now()
    private options: CircuitBreakerOptions

    constructor(
        private name: string,
        options?: Partial<CircuitBreakerOptions>
    ) {
        this.options = {
            failureThreshold: options?.failureThreshold || 5,
            successThreshold: options?.successThreshold || 2,
            timeout: options?.timeout || 60000, // 1 minute
            resetTimeout: options?.resetTimeout || 30000, // 30 seconds
        }
    }

    /**
     * Execute function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() < this.nextAttempt) {
                const error = new Error(`Circuit breaker is OPEN for ${this.name}`)
                logger.warn({ name: this.name, state: this.state }, error.message)
                throw error
            }

            // Transition to half-open to test service
            this.state = CircuitState.HALF_OPEN
            logger.info({ name: this.name }, 'Circuit breaker transitioning to HALF_OPEN')
        }

        try {
            const result = await this.executeWithTimeout(fn)
            this.onSuccess()
            return result
        } catch (error) {
            this.onFailure()
            throw error
        }
    }

    /**
     * Execute with timeout
     */
    private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
        return Promise.race([
            fn(),
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), this.options.timeout)
            ),
        ])
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        this.failureCount = 0

        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++

            if (this.successCount >= this.options.successThreshold) {
                this.state = CircuitState.CLOSED
                this.successCount = 0
                logger.info({ name: this.name }, 'Circuit breaker CLOSED')
            }
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(): void {
        this.failureCount++
        this.successCount = 0

        if (
            this.state === CircuitState.HALF_OPEN ||
            this.failureCount >= this.options.failureThreshold
        ) {
            this.state = CircuitState.OPEN
            this.nextAttempt = Date.now() + this.options.resetTimeout

            logger.error(
                { name: this.name, failureCount: this.failureCount },
                'Circuit breaker OPEN'
            )
        }
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttempt: this.nextAttempt,
        }
    }

    /**
     * Reset circuit breaker
     */
    reset(): void {
        this.state = CircuitState.CLOSED
        this.failureCount = 0
        this.successCount = 0
        this.nextAttempt = Date.now()
        logger.info({ name: this.name }, 'Circuit breaker reset')
    }
}

/**
 * Circuit breakers for external services
 */
export const circuitBreakers = {
    openai: new CircuitBreaker('OpenAI', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000, // 30 seconds
        resetTimeout: 60000, // 1 minute
    }),

    stripe: new CircuitBreaker('Stripe', {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 10000, // 10 seconds
        resetTimeout: 30000, // 30 seconds
    }),

    email: new CircuitBreaker('Email', {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 5000, // 5 seconds
        resetTimeout: 60000, // 1 minute
    }),

    minio: new CircuitBreaker('MinIO', {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 10000, // 10 seconds
        resetTimeout: 30000, // 30 seconds
    }),
}

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitBreakerStats() {
    return Object.entries(circuitBreakers).map(([name, breaker]) => breaker.getStats())
}
