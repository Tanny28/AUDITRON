import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
    // Server
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().default('http://localhost:3001'),

    // Database
    DATABASE_URL: z.string(),

    // Redis
    REDIS_URL: z.string(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // MinIO
    MINIO_ENDPOINT: z.string(),
    MINIO_PORT: z.string().transform(Number).default('9000'),
    MINIO_USE_SSL: z.string().transform((val) => val === 'true').default('false'),
    MINIO_ACCESS_KEY: z.string(),
    MINIO_SECRET_KEY: z.string(),
    MINIO_BUCKET: z.string().default('auditron-files'),

    // OpenAI
    OPENAI_API_KEY: z.string().optional(),

    // Groq
    GROQ_API_KEY: z.string().optional(),

    // Stripe
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
    RATE_LIMIT_TIMEWINDOW: z.string().default('1 minute'),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse(process.env);
