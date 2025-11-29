import type { AgentInput, AgentOutput, LogEntry } from '../types/agent'
import { AgentLogger } from '../services/AgentLogger'

export interface AgentConfig {
    name: string
    description: string
    version: string
    timeout?: number
    retryPolicy?: {
        maxRetries: number
        backoffMs: number
    }
}

/**
 * BaseAgent - Abstract base class for all agents
 * 
 * All specialized agents must extend this class and implement:
 * - validateInput()
 * - executeTask()
 * - produceOutput()
 */
export abstract class BaseAgent {
    protected config: AgentConfig
    protected logger: AgentLogger

    constructor(config: AgentConfig) {
        this.config = config
        this.logger = new AgentLogger(config.name)
    }

    /**
     * Main entry point for agent execution
     */
    async run(input: AgentInput): Promise<AgentOutput> {
        const startTime = Date.now()

        try {
            this.logger.info(`Starting ${this.config.name}`, {
                jobId: input.jobId,
                orgId: input.orgId,
            })

            // Validate input
            const validationResult = await this.validateInput(input)
            if (!validationResult.valid) {
                throw new Error(`Input validation failed: ${validationResult.error}`)
            }

            // Execute the agent's core task
            const result = await this.executeTask(input)

            // Produce structured output
            const output = await this.produceOutput(result, input)

            const duration = Date.now() - startTime
            this.logger.info(`Completed ${this.config.name}`, {
                jobId: input.jobId,
                duration,
                success: output.success,
            })

            return output
        } catch (error: any) {
            const duration = Date.now() - startTime
            this.logger.error(`Failed ${this.config.name}`, {
                jobId: input.jobId,
                duration,
                error: error.message,
                stack: error.stack,
            })

            return {
                success: false,
                error: error.message,
                logs: [error.stack],
            }
        }
    }

    /**
     * Validate input payload
     * Must be implemented by subclass
     */
    protected abstract validateInput(
        input: AgentInput
    ): Promise<{ valid: boolean; error?: string }>

    /**
     * Execute the agent's core task
     * Must be implemented by subclass
     */
    protected abstract executeTask(input: AgentInput): Promise<any>

    /**
     * Produce structured output from task result
     * Must be implemented by subclass
     */
    protected abstract produceOutput(
        result: any,
        input: AgentInput
    ): Promise<AgentOutput>

    /**
     * Get agent metadata
     */
    getMetadata() {
        return {
            name: this.config.name,
            description: this.config.description,
            version: this.config.version,
        }
    }

    /**
     * Retry wrapper with exponential backoff
     */
    protected async retryWithBackoff<T>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        backoffMs: number = 1000
    ): Promise<T> {
        let lastError: Error | null = null

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn()
            } catch (error: any) {
                lastError = error

                if (attempt < maxRetries - 1) {
                    const delay = backoffMs * Math.pow(2, attempt)
                    this.logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
                        delay,
                        error: error.message,
                    })
                    await new Promise((resolve) => setTimeout(resolve, delay))
                }
            }
        }

        throw lastError || new Error('Max retries exceeded')
    }
}
