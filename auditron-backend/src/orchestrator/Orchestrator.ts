import type { WorkflowState, OrchestratorPlan, WorkflowStep, StepResult, AgentOutput } from '../types/agent'
import { InvoiceAgent } from '../agents/InvoiceAgent'
import { ValidationAgent } from '../agents/ValidationAgent'
import { ReconciliationAgent } from '../agents/ReconciliationAgent'
import { GSTAgent } from '../agents/GSTAgent'
import { SummaryAgent } from '../agents/SummaryAgent'
import { AgentLogger } from '../services/AgentLogger'
import { prisma } from '../lib/prisma'

/**
 * Orchestrator - Central coordinator for all agents
 * 
 * Responsibilities:
 * - Load job metadata
 * - Select appropriate workflow
 * - Execute step-by-step plan
 * - Handle retries and errors
 * - Update job state
 * - Persist outputs
 */
export class Orchestrator {
    private logger: AgentLogger
    private agents: Map<string, any>

    constructor() {
        this.logger = new AgentLogger('Orchestrator')

        // Register all agents
        this.agents = new Map([
            ['InvoiceAgent', new InvoiceAgent()],
            ['ValidationAgent', new ValidationAgent()],
            ['ReconciliationAgent', new ReconciliationAgent()],
            ['GSTAgent', new GSTAgent()],
            ['SummaryAgent', new SummaryAgent()],
        ])
    }

    /**
     * Execute a workflow for a job
     */
    async execute(jobId: string): Promise<WorkflowState> {
        this.logger.info('Starting workflow execution', { jobId })

        try {
            // Load job
            const job = await prisma.agentJob.findUnique({
                where: { id: jobId },
            })

            if (!job) {
                throw new Error(`Job ${jobId} not found`)
            }

            // Create workflow plan
            const plan = this.createPlan(job.type, job.payload as any)

            // Initialize workflow state
            const state: WorkflowState = {
                jobId,
                workflowType: job.type,
                status: 'RUNNING',
                currentStep: 0,
                totalSteps: plan.steps.length,
                stepResults: [],
                startedAt: new Date(),
            }

            // Update job status
            await this.updateJobStatus(jobId, 'RUNNING', 0)

            // Execute steps
            for (let i = 0; i < plan.steps.length; i++) {
                const step = plan.steps[i]
                state.currentStep = i + 1

                this.logger.info(`Executing step ${i + 1}/${plan.steps.length}: ${step.agentName}`, { jobId })

                const stepResult = await this.executeStep(step, job, state)
                state.stepResults.push(stepResult)

                // Update progress
                const progress = Math.round(((i + 1) / plan.steps.length) * 100)
                await this.updateJobStatus(jobId, 'RUNNING', progress)

                // Handle step failure
                if (stepResult.status === 'FAILED') {
                    if (!step.optional) {
                        state.status = 'FAILED'
                        state.error = stepResult.error
                        state.completedAt = new Date()

                        await this.updateJobStatus(jobId, 'FAILED', progress, stepResult.error)

                        this.logger.error('Workflow failed', { jobId, step: step.stepId, error: stepResult.error })
                        return state
                    } else {
                        this.logger.warn('Optional step failed, continuing', { jobId, step: step.stepId })
                    }
                }
            }

            // Workflow completed successfully
            state.status = 'COMPLETED'
            state.completedAt = new Date()

            await this.updateJobStatus(jobId, 'COMPLETED', 100, undefined, this.extractFinalOutput(state))

            this.logger.info('Workflow completed successfully', { jobId })

            return state
        } catch (error: any) {
            this.logger.error('Workflow execution error', { jobId, error: error.message })

            await this.updateJobStatus(jobId, 'FAILED', 0, error.message)

            throw error
        }
    }

    /**
     * Create execution plan based on workflow type
     */
    private createPlan(workflowType: string, payload: any): OrchestratorPlan {
        const plans: Record<string, OrchestratorPlan> = {
            'invoice-processing': {
                workflowType: 'invoice-processing',
                steps: [
                    {
                        stepId: 'extract',
                        agentName: 'InvoiceAgent',
                        input: payload,
                        retryPolicy: { maxRetries: 2, backoffMs: 1000 },
                    },
                    {
                        stepId: 'validate',
                        agentName: 'ValidationAgent',
                        input: payload,
                        retryPolicy: { maxRetries: 1, backoffMs: 500 },
                    },
                    {
                        stepId: 'gst',
                        agentName: 'GSTAgent',
                        input: payload,
                        optional: true,
                    },
                    {
                        stepId: 'summarize',
                        agentName: 'SummaryAgent',
                        input: { ...payload, summaryType: 'invoice' },
                    },
                ],
            },
            'reconciliation-processing': {
                workflowType: 'reconciliation-processing',
                steps: [
                    {
                        stepId: 'reconcile',
                        agentName: 'ReconciliationAgent',
                        input: payload,
                        retryPolicy: { maxRetries: 2, backoffMs: 2000 },
                        timeout: 60000,
                    },
                    {
                        stepId: 'summarize',
                        agentName: 'SummaryAgent',
                        input: { ...payload, summaryType: 'reconciliation' },
                    },
                ],
            },
            'gst-processing': {
                workflowType: 'gst-processing',
                steps: [
                    {
                        stepId: 'classify',
                        agentName: 'GSTAgent',
                        input: payload,
                    },
                    {
                        stepId: 'summarize',
                        agentName: 'SummaryAgent',
                        input: { ...payload, summaryType: 'gst' },
                    },
                ],
            },
        }

        const plan = plans[workflowType]
        if (!plan) {
            throw new Error(`Unknown workflow type: ${workflowType}`)
        }

        return plan
    }

    /**
     * Execute a single workflow step
     */
    private async executeStep(
        step: WorkflowStep,
        job: any,
        state: WorkflowState
    ): Promise<StepResult> {
        const result: StepResult = {
            stepId: step.stepId,
            agentName: step.agentName,
            status: 'RUNNING',
            startedAt: new Date(),
            retryCount: 0,
        }

        const agent = this.agents.get(step.agentName)
        if (!agent) {
            result.status = 'FAILED'
            result.error = `Agent ${step.agentName} not found`
            result.completedAt = new Date()
            return result
        }

        // Prepare agent input
        const agentInput = {
            jobId: job.id,
            orgId: job.orgId,
            userId: job.userId,
            payload: {
                ...step.input,
                // Pass previous step outputs
                previousSteps: state.stepResults.map((r) => r.output),
            },
        }

        // Execute with retry
        const maxRetries = step.retryPolicy?.maxRetries || 0
        const backoffMs = step.retryPolicy?.backoffMs || 1000

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                result.retryCount = attempt

                const output: AgentOutput = await agent.run(agentInput)

                result.output = output
                result.status = output.success ? 'COMPLETED' : 'FAILED'
                result.error = output.error
                result.completedAt = new Date()

                if (output.success) {
                    return result
                }

                // If not successful and no more retries, fail
                if (attempt === maxRetries) {
                    return result
                }

                // Wait before retry
                await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)))
            } catch (error: any) {
                result.error = error.message

                if (attempt === maxRetries) {
                    result.status = 'FAILED'
                    result.completedAt = new Date()
                    return result
                }

                this.logger.warn(`Step retry ${attempt + 1}/${maxRetries}`, {
                    jobId: job.id,
                    step: step.stepId,
                    error: error.message,
                })

                await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)))
            }
        }

        return result
    }

    /**
     * Update job status in database
     */
    private async updateJobStatus(
        jobId: string,
        status: string,
        progress: number,
        error?: string,
        output?: any
    ) {
        await prisma.agentJob.update({
            where: { id: jobId },
            data: {
                status,
                progress,
                ...(error && { error }),
                ...(output && { output }),
                ...(status === 'COMPLETED' && { completedAt: new Date() }),
            },
        })
    }

    /**
     * Extract final output from workflow state
     */
    private extractFinalOutput(state: WorkflowState): any {
        const outputs: Record<string, any> = {}

        for (const stepResult of state.stepResults) {
            if (stepResult.output?.data) {
                outputs[stepResult.stepId] = stepResult.output.data
            }
        }

        return outputs
    }
}

// Singleton instance
export const orchestrator = new Orchestrator()
