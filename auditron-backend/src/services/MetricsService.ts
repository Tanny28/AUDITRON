import { FastifyRequest, FastifyReply } from 'fastify'
import { register, Counter, Histogram, Gauge } from 'prom-client'

/**
 * Prometheus Metrics Service
 * Collects and exposes metrics for monitoring
 */

// HTTP Request metrics
export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
})

export const httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
})

export const httpRequestErrors = new Counter({
    name: 'http_request_errors_total',
    help: 'Total number of HTTP request errors',
    labelNames: ['method', 'route', 'error_type'],
})

// Database metrics
export const databaseQueryDuration = new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'model'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
})

export const databaseQueryTotal = new Counter({
    name: 'database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'model'],
})

export const databaseConnectionPool = new Gauge({
    name: 'database_connection_pool_size',
    help: 'Current size of database connection pool',
})

// Queue metrics
export const queueJobsTotal = new Counter({
    name: 'queue_jobs_total',
    help: 'Total number of queue jobs',
    labelNames: ['queue', 'status'],
})

export const queueJobDuration = new Histogram({
    name: 'queue_job_duration_seconds',
    help: 'Duration of queue job processing',
    labelNames: ['queue', 'job_type'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
})

export const queueLength = new Gauge({
    name: 'queue_length',
    help: 'Current length of queue',
    labelNames: ['queue'],
})

// Agent metrics
export const agentExecutionDuration = new Histogram({
    name: 'agent_execution_duration_seconds',
    help: 'Duration of agent execution',
    labelNames: ['agent_name', 'status'],
    buckets: [1, 5, 10, 30, 60, 120],
})

export const agentExecutionTotal = new Counter({
    name: 'agent_executions_total',
    help: 'Total number of agent executions',
    labelNames: ['agent_name', 'status'],
})

// API Key metrics
export const apiKeyUsage = new Counter({
    name: 'api_key_usage_total',
    help: 'Total API key usage',
    labelNames: ['org_id', 'endpoint'],
})

export const apiKeyValidationErrors = new Counter({
    name: 'api_key_validation_errors_total',
    help: 'Total API key validation errors',
})

// Business metrics
export const invoicesProcessed = new Counter({
    name: 'invoices_processed_total',
    help: 'Total number of invoices processed',
    labelNames: ['status'],
})

export const reconciliationsCompleted = new Counter({
    name: 'reconciliations_completed_total',
    help: 'Total number of reconciliations completed',
    labelNames: ['status'],
})

// System metrics
export const activeUsers = new Gauge({
    name: 'active_users',
    help: 'Number of currently active users',
})

export const activeOrganizations = new Gauge({
    name: 'active_organizations',
    help: 'Number of active organizations',
})

/**
 * Metrics middleware
 * Tracks HTTP request metrics
 */
export function metricsMiddleware(request: FastifyRequest, reply: FastifyReply, done: () => void) {
    const start = Date.now()

    // Track request
    reply.addHook('onSend', () => {
        const duration = (Date.now() - start) / 1000
        const route = request.routeOptions.url || request.url
        const method = request.method
        const statusCode = reply.statusCode.toString()

        // Record metrics
        httpRequestDuration.observe({ method, route, status_code: statusCode }, duration)
        httpRequestTotal.inc({ method, route, status_code: statusCode })

        // Track errors
        if (reply.statusCode >= 400) {
            const errorType = reply.statusCode >= 500 ? 'server_error' : 'client_error'
            httpRequestErrors.inc({ method, route, error_type: errorType })
        }
    })

    done()
}

/**
 * Metrics endpoint
 * Exposes Prometheus metrics
 */
export async function metricsEndpoint(request: FastifyRequest, reply: FastifyReply) {
    reply.header('Content-Type', register.contentType)
    return reply.send(await register.metrics())
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics() {
    register.resetMetrics()
}

/**
 * Get current metrics as JSON (for debugging)
 */
export async function getMetricsJSON() {
    const metrics = await register.getMetricsAsJSON()
    return metrics
}
