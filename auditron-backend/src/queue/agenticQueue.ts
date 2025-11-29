import { Queue, Worker, Job } from 'bullmq'
import { config } from '../config'
import { orchestrator } from '../orchestrator/Orchestrator'
import { AgentLogger } from '../services/AgentLogger'

const logger = new AgentLogger('AgenticQueue')

/**
 * Agentic Queue - BullMQ queue for agent jobs
 */
export const agenticQueue = new Queue('agentic-jobs', {
    connection: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
            count: 500, // Keep last 500 failed jobs
        },
    },
})

/**
 * Add a job to the queue
 */
export async function addAgenticJob(
    type: string,
    payload: any,
    options?: {
        priority?: number
        delay?: number
    }
): Promise<string> {
    const job = await agenticQueue.add(
        type,
        payload,
        {
            priority: options?.priority,
            delay: options?.delay,
        }
    )

    logger.info('Job added to queue', {
        jobId: job.id,
        type,
    })

    return job.id as string
}

/**
 * Worker to process agentic jobs
 */
export const agenticWorker = new Worker(
    'agentic-jobs',
    async (job: Job) => {
        logger.info('Processing job', {
            jobId: job.id,
            type: job.name,
        })

        try {
            // Execute workflow via orchestrator
            const result = await orchestrator.execute(job.data.jobId)

            logger.info('Job completed', {
                jobId: job.id,
                status: result.status,
            })

            return result
        } catch (error: any) {
            logger.error('Job failed', {
                jobId: job.id,
                error: error.message,
            })

            throw error
        }
    },
    {
        connection: {
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
        },
        concurrency: 5, // Process up to 5 jobs concurrently
    }
)

/**
 * Event handlers
 */
agenticWorker.on('completed', (job) => {
    logger.info('Job completed successfully', {
        jobId: job.id,
    })
})

agenticWorker.on('failed', (job, error) => {
    logger.error('Job failed', {
        jobId: job?.id,
        error: error.message,
    })
})

agenticWorker.on('error', (error) => {
    logger.error('Worker error', { error: error.message })
})

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing worker...')
    await agenticWorker.close()
    await agenticQueue.close()
    process.exit(0)
})
