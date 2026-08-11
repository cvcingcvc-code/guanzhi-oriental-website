import type { FastifyRequest } from 'fastify';
import { db } from '../db/client.js';
import { auditLogs } from '../db/schema.js';
import { ipHash } from './http.js';

export async function audit(
  request: FastifyRequest,
  action: string,
  entityType: string,
  entityId?: string,
  before?: unknown,
  after?: unknown,
) {
  await db.insert(auditLogs).values({
    actorId: request.user?.sub,
    action,
    entityType,
    entityId,
    before,
    after,
    ipHash: ipHash(request),
  });
}
