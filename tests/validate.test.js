/* Legacy validator tests migrated to current frontend/backend contract parity. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const frontend = await readFile(resolve('src/public/InquiryDialog.tsx'), 'utf8');
const backend = await readFile(resolve('backend/src/routes/public.ts'), 'utf8');

describe('inquiry field limits stay aligned', () => {
  for (const value of [80, 160, 254, 100, 2000]) {
    it(`keeps ${value} in both frontend and backend validation`, () => {
      assert.match(frontend, new RegExp(String(value))); assert.match(backend, new RegExp(String(value)));
    });
  }
  it('keeps all allowed intent values aligned', () => {
    for (const intent of ['custom-rd', 'co-production', 'licensing', 'white-label', 'per-group', 'training']) {
      assert.match(frontend, new RegExp(intent)); assert.match(backend, new RegExp(intent));
    }
  });
});
