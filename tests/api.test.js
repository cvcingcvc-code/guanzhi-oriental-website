/* Legacy gate migrated to the current Fastify inquiry integration suite.
 * The authoritative API behavior lives in backend/tests/inquiry.test.ts and is
 * executed by `npm test` in backend. This root check prevents the retired
 * `/api/contact` prototype from returning to the public frontend. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const app = await readFile(resolve('src/public/InquiryDialog.tsx'), 'utf8');
const route = await readFile(resolve('backend/src/routes/public.ts'), 'utf8');

describe('current inquiry integration contract', () => {
  it('frontend submits to the Fastify v1 endpoint', () => assert.match(app, /fetch\('\/api\/v1\/inquiries'/));
  it('frontend never uses the retired prototype endpoint', () => assert.doesNotMatch(app, /\/api\/contact|\/api\/inquiries/));
  it('Fastify validates the current fields and Drizzle persistence call', () => {
    for (const field of ['name', 'organization', 'email', 'intent']) assert.match(route, new RegExp(field));
    assert.match(route, /repository\.createInquiry/);
  });
});
