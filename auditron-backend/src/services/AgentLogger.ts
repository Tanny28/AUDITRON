import type { LogEntry } from '../types/agent'
import { prisma } from '../lib/prisma'

/**
 * AgentLogger - Structured logging for agent operations
 * 
 * Logs to:
 * - Console (development)
 * - Database audit log
 * - File logs (optional)
 */
export class AgentLogger {
    private agentName: string

    constructor(agentName: string) {
        this.agentName = agentName
    }

    /**
     * Log debug message
     */
    debug(message: string, metadata?: Record<string, any>) {
        this.log('DEBUG', message, metadata)
    }

    /**
     * Log info message
     */
    info(message: string, metadata?: Record<string, any>) {
        this.log('INFO', message, metadata)
    }

    /**
     * Log warning
     */
    warn(message: string, metadata?: Record<string, any>) {
        this.log('WARN', message, metadata)
    }

    /**
     * Log error
     */
    error(message: string, metadata?: Record<string, any>) {
        this.log('ERROR', message, metadata)
    }

    /**
     * Internal log method
     */
    private async log(
        level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
        message: string,
        metadata?: Record<string, any>
    ) {
        const entry: LogEntry = {
            timestamp: new Date(),
            jobId: metadata?.jobId || 'unknown',
            agentName: this.agentName,
            level,
            message,
            metadata,
        }

        // Console log
        const logMethod = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log
        logMethod(`[${level}] [${this.agentName}] ${message}`, metadata || '')

        // Database log (async, don't await to avoid blocking)
        this.saveToDatabase(entry).catch((err) => {
            console.error('Failed to save log to database:', err)
        })
    }

    /**
     * Save log entry to database
     */
    private async saveToDatabase(entry: LogEntry) {
        try {
            // TODO: Create AuditLog or AgentLog table in Prisma schema
            // For now, we'll use a simple approach

            // Example structure (add to schema.prisma):
            // model AgentLog {
            //   id        String   @id @default(cuid())
            //   timestamp DateTime @default(now())
            //   jobId     String
            //   agentName String
            //   level     String
            //   message   String
            //   metadata  Json?
            // }

            // await prisma.agentLog.create({
            //   data: {
            //     jobId: entry.jobId,
            //     agentName: entry.agentName,
            //     level: entry.level,
            //     message: entry.message,
            //     metadata: entry.metadata || {},
            //   },
            // })
        } catch (error) {
            console.error('Database logging error:', error)
        }
    }

    /**
     * Get logs for a specific job
     */
    static async getJobLogs(jobId: string): Promise<LogEntry[]> {
        try {
            // TODO: Query from database
            // const logs = await prisma.agentLog.findMany({
            //   where: { jobId },
            //   orderBy: { timestamp: 'asc' },
            // })
            // return logs as LogEntry[]

            return []
        } catch (error) {
            console.error('Failed to fetch job logs:', error)
            return []
        }
    }
}
