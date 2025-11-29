import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/index';
import { prisma } from './lib/prisma';
import { initializeMinIO } from './lib/minio';

// Routes
import { authRoutes } from './modules/auth/routes';
import { orgRoutes } from './modules/org/routes';
import { invoiceRoutes } from './modules/invoice/routes';
import { transactionRoutes } from './modules/transaction/routes';
import { reconciliationRoutes } from './modules/reconciliation/routes';
import { reportRoutes } from './modules/reports/routes';
import { agentRoutes } from './modules/agent/routes';

const fastify = Fastify({
    logger: {
        level: config.NODE_ENV === 'development' ? 'info' : 'warn',
        transport: config.NODE_ENV === 'development' ? {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        } : undefined,
    },
});

// Register plugins
async function registerPlugins() {
    // CORS
    await fastify.register(cors, {
        origin: config.CORS_ORIGIN,
        credentials: true,
    });

    // Security headers
    await fastify.register(helmet, {
        contentSecurityPolicy: config.NODE_ENV === 'production',
    });

    // JWT
    await fastify.register(jwt, {
        secret: config.JWT_SECRET,
    });

    // Multipart (file uploads)
    await fastify.register(multipart, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        },
    });

    // Rate limiting
    await fastify.register(rateLimit, {
        max: config.RATE_LIMIT_MAX,
        timeWindow: config.RATE_LIMIT_TIMEWINDOW,
    });

    // Swagger documentation
    await fastify.register(swagger, {
        openapi: {
            info: {
                title: 'AUDITRON API',
                description: 'AI-driven accounting automation platform API',
                version: '1.0.0',
            },
            servers: [
                {
                    url: `http://localhost:${config.PORT}`,
                    description: 'Development server',
                },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
        },
    });

    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false,
        },
    });
}

// JWT authentication decorator
fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
    }
});

// Register routes
async function registerRoutes() {
    // Health check
    fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // API routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(orgRoutes, { prefix: '/api/org' });
    await fastify.register(invoiceRoutes, { prefix: '/api/invoice' });
    await fastify.register(transactionRoutes, { prefix: '/api/transactions' });
    await fastify.register(reconciliationRoutes, { prefix: '/api/reconcile' });
    await fastify.register(reportRoutes, { prefix: '/api/reports' });
    await fastify.register(agentRoutes, { prefix: '/api/agent' });
}

// Error handler
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    reply.status(error.statusCode || 500).send({
        error: error.message || 'Internal Server Error',
        statusCode: error.statusCode || 500,
    });
});

// Start server
async function start() {
    try {
        // Initialize MinIO
        await initializeMinIO();

        // Register plugins and routes
        await registerPlugins();
        await registerRoutes();

        // Start listening
        await fastify.listen({
            port: parseInt(config.PORT),
            host: '0.0.0.0',
        });

        console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🚀 AUDITRON API Server Running          ║
║                                           ║
║   Port: ${config.PORT}                           ║
║   Environment: ${config.NODE_ENV}              ║
║   Docs: http://localhost:${config.PORT}/docs    ║
║                                           ║
╚═══════════════════════════════════════════╝
    `);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
    process.on(signal, async () => {
        console.log(`\n${signal} received, shutting down gracefully...`);
        await fastify.close();
        await prisma.$disconnect();
        process.exit(0);
    });
});

start();
