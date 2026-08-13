import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { ZodType } from 'zod';
import { config } from '../config.js';

export class HttpError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(422, '请求参数校验失败', result.error.issues);
  return result.data;
}

export function ipHash(request: FastifyRequest) {
  return createHash('sha256').update(`${config.IP_HASH_SALT}:${request.ip}`).digest('hex');
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '\uFEFF';
  const headers = Object.keys(rows[0] ?? {});
  const quote = (value: unknown) => {
    const text = String(value ?? '');
    const spreadsheetSafe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${spreadsheetSafe.replaceAll('"', '""')}"`;
  };
  return `\uFEFF${headers.map(quote).join(',')}\r\n${rows.map((row) => headers.map((key) => quote(row[key])).join(',')).join('\r\n')}`;
}
