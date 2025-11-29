import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import Redis from 'ioredis'
import { config } from '../config'
import { logger } from '../lib/logger'
import { queueJobsTotal, queueJobDuration, queueLength } from '../services/MetricsService'

/**
 * Enhanced Queue Configuration with Reliability Features
 */

// Redis connection for BullMQ
const connection = new Redis({
    host: config.REDIS_URL.split('://')[1].split(':')[0],
    port: parseInt(config.REDIS_URL.split(':')[2] || '6379'),
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
})

/**
 * Job options with retry and backoff
 */
export const defaultJobOptions = {
    attempts: 3, // Retry up to 3 times
    backoff: {
        type: 'exponential' as const,
        delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
        age: 86400, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
        count: 5000, // Keep last 5000 failed jobs
    },
}

/**
 * Agentic Jobs Queue
 */
export const agenticQueue = new Queue('agentic-jobs', {
    connection,
    defaultJobOptions,
})

/**
 * Dead Letter Queue for failed jobs
 */
export const deadLetterQueue = new Queue('dead-letter', {
    connection,
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 1, // Don't retry dead letter jobs
    },
})

/**
 * Queue Events for monitoring
 */
const queueEvents = new QueueEvents('agentic-jobs', { connection })

// Monitor queue events
queueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Job completed')
    queueJobsTotal.inc({ queue: 'agentic-jobs', status: 'completed' })
})

queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, 'Job failed')
    queueJobsTotal.inc({ queue: 'agentic-jobs', status: 'failed' })
})

queueEvents.on('stalled', ({ jobId }) => {
    logger.warn({ jobId }, 'Job stalled')
    queueJobsTotal.inc({ queue: 'agentic-jobs', status: 'stalled' })
})

/**
 * Update queue length metrics periodically
 */
setInterval(async () => {
    try {
        const waiting = await agenticQueue.getWaitingCount()
        const active = await agenticQueue.getActiveCount()
        const delayed = await agenticQueue.getDelayedCount()

        queueLength.set({ queue: 'agentic-jobs' }, waiting + active + delayed)
    } catch (error) {
        logger.error({ error }, 'Failed to update queue metrics')
    }
}, 10000) // Update every 10 seconds

/**
 * Add job to queue with enhanced options
 */
export async function addAgenticJob(
    jobType: string,
    data: any,
    options?: {
        priority?: number
        delay?: number
        jobId?: string
    }
) {
    try {
        const job = await agenticQueue.add(jobType, data, {
            ...options,
            priority: options?.priority || 0,
            delay: options?.delay || 0,
            jobId: options?.jobId,
        })

        logger.info({ jobId: job.id, jobType }, 'Job added to queue')
        queueJobsTotal.inc({ queue: 'agentic-jobs', status: 'added' })

        return job
    } catch (error) {
        logger.error({ error, jobType }, 'Failed to add job to queue')
        throw error
    }
}

/**
 * Process failed jobs and move to dead letter queue
 */
export async function moveToDeadLetter(job: Job) {
    try {
        await deadLetterQueue.add('failed-job', {
            originalJobId: job.id,
            originalJobName: job.name,
            originalJobData: job.data,
            failedReason: job.failedReason,
            attemptsMade: job.attemptsMade,
            timestamp: new Date().toISOString(),
        })

        logger.warn({ jobId: job.id }, 'Job moved to dead letter queue')
    } catch (error) {
        logger.error({ error, jobId: job.id }, 'Failed to move job to dead letter queue')
    }
}

/**
 * Retry failed job from dead letter queue
 */
export async function retryFromDeadLetter(deadLetterJobId: string) {
    try {
        const job = await deadLetterQueue.getJob(deadLetterJobId)

        if (!job) {
            throw new Error('Dead letter job not found')
        }

        const originalData = job.data.originalJobData
        const originalJobName = job.data.originalJobName

        // Add back to original queue
        await agenticQueue.add(originalJobName, originalData, {
            priority: 10, // Higher priority for retried jobs
        })

        // Remove from dead letter queue
        await job.remove()

        logger.info({ deadLetterJobId }, 'Job retried from dead letter queue')
    } catch (error) {
        logger.error({ error, deadLetterJobId }, 'Failed to retry job from dead letter queue')
        throw error
    }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    try {
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
            agenticQueue.getWaitingCount(),
            agenticQueue.getActiveCount(),
            agenticQueue.getCompletedCount(),
            agenticQueue.getFailedCount(),
            agenticQueue.getDelayedCount(),
            agenticQueue.getPausedCount(),
        ])

        const deadLetterCount = await deadLetterQueue.getWaitingCount()

        return {
            agentic: {
                waiting,
                active,
                completed,
                failed,
                delayed,
                paused,
                total: waiting + active + delayed,
            },
            deadLetter: {
                count: deadLetterCount,
            },
        }
    } catch (error) {
        logger.error({ error }, 'Failed to get queue stats')
        return null
    }
}

/**
 * Pause queue
 */
export async function pauseQueue() {
    await agenticQueue.pause()
    logger.warn('Queue paused')
}

/**
 * Resume queue
 */
export async function resumeQueue() {
    await agenticQueue.resume()
    logger.info('Queue resumed')
}

/**
 * Clean old jobs
 */
export async function cleanQueue(grace: number = 86400000) {
    // Clean completed jobs older than grace period (default 24 hours)
    await agenticQueue.clean(grace, 1000, 'completed')

    // Clean failed jobs older than 7 days
    await agenticQueue.clean(604800000, 1000, 'failed')

    logger.info({ grace }, 'Queue cleaned')
}

/**
 * Close queue connections
 */
export async function closeQueues() {
    await agenticQueue.close()
    await deadLetterQueue.close()
    await queueEvents.close()
    await connection.quit()
    logger.info('Queue connections closed')
}
