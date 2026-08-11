import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { inquiries } from '../db/schema.js';
import { config } from '../config.js';
import { ipHash, parse } from '../lib/http.js';

const localeSchema = z.enum(['zh-CN', 'en']);
const inquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  organization: z.string().trim().min(2).max(160),
  jobTitle: z.string().trim().max(80).optional(),
  email: z.email().max(254),
  contact: z.string().trim().min(6).max(100).optional(),
  intent: z.enum(['custom-rd', 'co-production', 'licensing', 'white-label', 'per-group', 'training', 'other']),
  message: z.string().trim().max(2000).optional(),
  locale: localeSchema.default('zh-CN'),
  sourceUrl: z.url().max(1000).optional(),
  website: z.string().max(0).optional(),
});

async function notifyInquiry(input: z.infer<typeof inquirySchema>, id: string) {
  if (!config.RESEND_API_KEY || !config.NOTIFICATION_FROM || !config.NOTIFICATION_TO) return;
  const body = [`姓名：${input.name}`, `机构：${input.organization}`, `邮箱：${input.email}`, `联系方式：${input.contact ?? '-'}`, `意向：${input.intent}`, `留言：${input.message ?? '-'}`, `线索编号：${id}`].join('\n');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${config.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: config.NOTIFICATION_FROM, to: [config.NOTIFICATION_TO], subject: `[观止东方] 新合作咨询 — ${input.name} / ${input.organization}`, text: body }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
}

const routes: FastifyPluginAsync = async (app) => {
  app.get('/health', { schema: { tags: ['公共'], summary: '服务健康检查' } }, async () => {
    await db.execute('select 1');
    return { ok: true, data: { status: 'healthy', timestamp: new Date().toISOString() } };
  });

  app.post('/inquiries', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    schema: {
      tags: ['合作咨询'], summary: '提交合作需求',
      body: { type: 'object', required: ['name', 'organization', 'email', 'intent'], properties: { name: { type: 'string' }, organization: { type: 'string' }, jobTitle: { type: 'string' }, email: { type: 'string', format: 'email' }, contact: { type: 'string' }, intent: { type: 'string' }, message: { type: 'string' }, locale: { type: 'string' }, sourceUrl: { type: 'string' }, website: { type: 'string', maxLength: 0 } } },
    },
  }, async (request, reply) => {
    const input = parse(inquirySchema, request.body);
    const { website: _honeypot, ...inquiry } = input;
    const [created] = await db.insert(inquiries).values({ ...inquiry, ipHash: ipHash(request) }).returning({ id: inquiries.id, createdAt: inquiries.createdAt });
    if (!created) throw new Error('Failed to create inquiry');
    void notifyInquiry(input, created.id).catch((error) => request.log.error({ error, inquiryId: created.id }, 'notification failed'));
    return reply.code(201).send({ ok: true, data: created });
  });
};

export default routes;
