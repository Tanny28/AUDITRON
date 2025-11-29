import OpenAI from 'openai'
import { config } from '../config'

interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

interface ChatCompletionOptions {
    model?: string
    temperature?: number
    maxTokens?: number
    responseFormat?: 'text' | 'json_object'
}

/**
 * AiModelService - Wrapper for OpenAI API
 * 
 * Provides:
 * - Chat completions
 * - Structured outputs
 * - Embeddings
 * - Auto-retry with backoff
 * - Rate limit handling
 */
export class AiModelService {
    private client: OpenAI
    private defaultModel: string = 'gpt-4-turbo-preview'

    constructor() {
        this.client = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
        })
    }

    /**
     * Chat completion
     */
    async chatCompletion(
        messages: ChatMessage[],
        options: ChatCompletionOptions = {}
    ): Promise<string> {
        const {
            model = this.defaultModel,
            temperature = 0.7,
            maxTokens = 2000,
            responseFormat = 'text',
        } = options

        try {
            const response = await this.retryWithBackoff(async () => {
                return await this.client.chat.completions.create({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                    ...(responseFormat === 'json_object' && {
                        response_format: { type: 'json_object' },
                    }),
                })
            })

            return response.choices[0]?.message?.content || ''
        } catch (error: any) {
            console.error('Chat completion error:', error)
            throw new Error(`AI model error: ${error.message}`)
        }
    }

    /**
     * Structured output using JSON mode
     */
    async structuredOutput<T>(
        prompt: string,
        schema: Record<string, any>,
        systemPrompt?: string
    ): Promise<T> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content:
                    systemPrompt ||
                    `You are a helpful assistant that outputs valid JSON matching the provided schema. Schema: ${JSON.stringify(schema)}`,
            },
            {
                role: 'user',
                content: prompt,
            },
        ]

        const response = await this.chatCompletion(messages, {
            responseFormat: 'json_object',
            temperature: 0.3,
        })

        try {
            return JSON.parse(response) as T
        } catch (error) {
            throw new Error('Failed to parse structured output as JSON')
        }
    }

    /**
     * Generate embeddings
     */
    async embedding(text: string): Promise<number[]> {
        try {
            const response = await this.retryWithBackoff(async () => {
                return await this.client.embeddings.create({
                    model: 'text-embedding-ada-002',
                    input: text,
                })
            })

            return response.data[0].embedding
        } catch (error: any) {
            console.error('Embedding error:', error)
            throw new Error(`Embedding error: ${error.message}`)
        }
    }

    /**
     * Retry with exponential backoff
     */
    private async retryWithBackoff<T>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error | null = null

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn()
            } catch (error: any) {
                lastError = error

                // Check if it's a rate limit error
                if (error.status === 429) {
                    const retryAfter = error.headers?.['retry-after']
                    const delay = retryAfter
                        ? parseInt(retryAfter) * 1000
                        : baseDelay * Math.pow(2, attempt)

                    console.warn(`Rate limited, retrying after ${delay}ms`)
                    await new Promise((resolve) => setTimeout(resolve, delay))
                    continue
                }

                // For other errors, use exponential backoff
                if (attempt < maxRetries - 1) {
                    const delay = baseDelay * Math.pow(2, attempt)
                    await new Promise((resolve) => setTimeout(resolve, delay))
                }
            }
        }

        throw lastError || new Error('Max retries exceeded')
    }

    /**
     * Calculate token count (approximate)
     */
    estimateTokens(text: string): number {
        // Rough estimate: ~4 characters per token
        return Math.ceil(text.length / 4)
    }
}

// Singleton instance
export const aiModelService = new AiModelService()
