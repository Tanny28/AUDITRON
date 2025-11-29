import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends FastifyRequest {
    user: {
        id: string;
        email: string;
        role: UserRole;
        organizationId: string;
    };
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
    if (!request.user) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
    }
    done();
}

export function requireRole(...roles: UserRole[]) {
    return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
        const authReq = request as AuthenticatedRequest;

        if (!authReq.user) {
            reply.code(401).send({ error: 'Unauthorized' });
            return;
        }

        if (!roles.includes(authReq.user.role)) {
            reply.code(403).send({ error: 'Forbidden: Insufficient permissions' });
            return;
        }

        done();
    };
}
