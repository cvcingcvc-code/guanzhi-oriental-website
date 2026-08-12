import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type { HomepageActorContext, HomepageEditorState, HomepageRepository, HomepageTranslations } from '../src/homepage/repository.js';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';

const {
  HomepageInactiveMediaError,
  HomepageRevisionConflictError,
  HomepageRevisionNotFoundError,
  activeHomepageAssetsQuery,
  homepageAssetIds,
  inactiveHomepageAssetIds,
  homepageTranslationsEqual,
  homepageTranslationsSchema,
} = await import('../src/homepage/repository.js');
const { createAdminHomepageRoutes } = await import('../src/routes/admin-homepage.js');
const { preventGenericHomepageWrite } = await import('../src/routes/admin-pages.js');
const { HttpError } = await import('../src/lib/http.js');
const { db } = await import('../src/db/client.js');

const pageId = '00000000-0000-4000-8000-000000000001';
const actorId = '00000000-0000-4000-8000-000000000002';
const assetId = '00000000-0000-4000-8000-000000000003';

function media(extra: Record<string, unknown> = {}) {
  return { fallbackUrl: '/images/example.png', alt: { 'zh-CN': '图片', en: 'Image' }, ...extra };
}

function document(label: string, referencedAssetId?: string) {
  const referencedMedia = media(referencedAssetId ? { assetId: referencedAssetId } : {});
  return {
    version: 1 as const,
    blocks: [
      { type: 'hero' as const, enabled: true, order: 10, contentStatus: 'approved' as const, eyebrow: label, headingLines: [label], description: label, primaryCta: { label, action: 'scroll' as const, target: 'solutions' }, media: referencedMedia },
      { type: 'about' as const, enabled: true, order: 20, contentStatus: 'approved' as const, lead: label, headingLines: [label], paragraphs: [label] },
      { type: 'capabilities' as const, enabled: true, order: 30, contentStatus: 'approved' as const, headingLines: [label], intro: label, items: [{ id: 'capability', enabled: true, order: 10, number: '01', title: label, description: label }] },
      { type: 'motifs' as const, enabled: true, order: 40, contentStatus: 'approved' as const, headingLines: [label], intro: label, items: [{ id: 'motif', enabled: true, order: 10, title: label, titleEn: label, description: label, status: label, media: media() }] },
      { type: 'jiangnan' as const, enabled: true, order: 50, contentStatus: 'approved' as const, headingLines: [label], description: label, media: media() },
      { type: 'partners' as const, enabled: true, order: 60, contentStatus: 'approved' as const, heading: label, items: [{ id: 'partner', enabled: true, order: 10, title: label, media: media() }] },
      { type: 'contact' as const, enabled: true, order: 70, contentStatus: 'approved' as const, kicker: label, headingLines: [label], cta: { label, action: 'inquiry' as const, target: 'inquiry' } },
    ],
  };
}

function translations(label = 'Published', referencedAssetId?: string): HomepageTranslations {
  return homepageTranslationsSchema.parse([
    { locale: 'en', title: `${label} EN`, blocks: document(`${label} EN`, referencedAssetId) },
    { locale: 'zh-CN', title: `${label} ZH`, seoTitle: null, seoDescription: null, blocks: document(`${label} ZH`, referencedAssetId) },
  ]);
}

function state(overrides: Partial<HomepageEditorState> = {}): HomepageEditorState {
  return {
    page: { id: pageId, slug: 'home', status: 'PUBLISHED', publishedAt: new Date('2026-08-12T00:00:00Z'), updatedAt: new Date('2026-08-12T00:00:00Z') },
    revision: 0,
    savedAt: new Date('2026-08-12T00:00:00Z'),
    source: 'published',
    translations: translations(),
    ...overrides,
  };
}

class MemoryHomepageRepository implements HomepageRepository {
  current = state();
  latestRevision = 0;
  publishError: Error | undefined;
  audits: Array<{ action: 'SAVE_DRAFT' | 'PUBLISH'; actor: HomepageActorContext; revision: number; source: string }> = [];

  async get() { return this.current; }

  async saveDraft(baseRevision: number, nextTranslations: HomepageTranslations, actor: HomepageActorContext) {
    if (baseRevision !== this.latestRevision) throw new HomepageRevisionConflictError(this.latestRevision);
    this.latestRevision += 1;
    const source = homepageTranslationsEqual(nextTranslations, this.current.translations) ? 'published' : 'draft';
    this.current = state({ revision: this.latestRevision, source, translations: nextTranslations });
    this.audits.push({ action: 'SAVE_DRAFT', actor, revision: this.current.revision, source: this.current.source });
    return this.current;
  }

  async publish(revision: number, actor: HomepageActorContext) {
    if (this.publishError) throw this.publishError;
    if (revision !== this.latestRevision) throw new HomepageRevisionConflictError(this.latestRevision);
    this.current = state({ revision, source: 'published', translations: this.current.translations });
    this.audits.push({ action: 'PUBLISH', actor, revision: this.current.revision, source: this.current.source });
    return this.current;
  }
}

async function setup(role: 'ADMIN' | 'EDITOR' = 'ADMIN') {
  const repository = new MemoryHomepageRepository();
  const app = Fastify();
  app.decorate('authenticate', async (request: { user: unknown }) => {
    request.user = { sub: actorId, email: 'user@example.test', role, name: 'User' };
  });
  app.decorate('requireAdmin', async (request: { user: unknown }, reply: { code(status: number): { send(body: unknown): unknown } }) => {
    request.user = { sub: actorId, email: 'user@example.test', role, name: 'User' };
    if (role !== 'ADMIN') return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: '需要管理员权限' } });
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) return reply.code(error.statusCode).send({ ok: false, error: { message: error.message, details: error.details } });
    return reply.send(error);
  });
  await app.register(createAdminHomepageRoutes(repository), { prefix: '/api/v1/admin/homepage' });
  return { app, repository };
}

test('双语首页草稿 Schema 固定语言顺序并把 SEO 缺省值规范化为 null', () => {
  const parsed = translations();
  assert.deepEqual(parsed.map((translation) => translation.locale), ['zh-CN', 'en']);
  assert.equal(parsed[0]?.seoTitle, null);
  assert.equal(parsed[0]?.seoDescription, null);
  assert.throws(() => homepageTranslationsSchema.parse([parsed[0], parsed[0]]), /zh-CN/);
  const incomplete = structuredClone(parsed);
  incomplete[0]!.blocks.blocks.pop();
  assert.throws(() => homepageTranslationsSchema.parse(incomplete), /七个/);
});

test('双语首页草稿按 order 规范化 blocks 与列表项目数组', () => {
  const shuffled = structuredClone(translations());
  for (const translation of shuffled) {
    translation.blocks.blocks.reverse();
    const capabilities = translation.blocks.blocks.find((block) => block.type === 'capabilities');
    if (capabilities) {
      capabilities.items.push({ ...capabilities.items[0]!, id: 'capability-two', order: 5 });
      capabilities.items.reverse();
    }
  }

  const parsed = homepageTranslationsSchema.parse(shuffled);
  assert.deepEqual(parsed[0]?.blocks.blocks.map((block) => block.type), [
    'hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact',
  ]);
  const capabilities = parsed[0]?.blocks.blocks.find((block) => block.type === 'capabilities');
  assert.deepEqual(capabilities?.items.map((item) => item.order), [5, 10]);
});

test('通用页面写入入口拒绝创建、更新、发布或撤回 home', () => {
  assert.throws(() => preventGenericHomepageWrite(undefined, 'home'), (error: unknown) => error instanceof HttpError && error.statusCode === 409 && /admin\/homepage/.test(error.message));
  assert.throws(() => preventGenericHomepageWrite('home', 'renamed-home'), (error: unknown) => error instanceof HttpError && error.statusCode === 409);
  assert.throws(() => preventGenericHomepageWrite('home'), (error: unknown) => error instanceof HttpError && error.statusCode === 409);
  assert.doesNotThrow(() => preventGenericHomepageWrite('about', 'brand-story'));
});

test('规范化内容比较识别已发布状态，并完整收集去重的 assetId', () => {
  const left = translations('Same', assetId);
  const right = homepageTranslationsSchema.parse([...structuredClone(left)].reverse());
  assert.equal(homepageTranslationsEqual(left, right), true);
  const changed = structuredClone(right);
  changed[0]!.title = 'Changed';
  assert.equal(homepageTranslationsEqual(left, homepageTranslationsSchema.parse(changed)), false);
  assert.deepEqual(homepageAssetIds(left), [assetId]);
  assert.deepEqual(inactiveHomepageAssetIds([assetId, 'asset-two'], ['asset-two']), [assetId]);
  assert.deepEqual(inactiveHomepageAssetIds([assetId], [assetId]), []);
});

test('发布媒体查询包含 active 条件和 FOR SHARE 行锁', () => {
  const query = activeHomepageAssetsQuery(db, [assetId]).toSQL();
  assert.match(query.sql, /deleted_at.*is null/i);
  assert.match(query.sql, /for share/i);
});

test('GET 返回固定 Homepage Editor 响应，PUT 保存草稿且不调用发布', async () => {
  const { app, repository } = await setup();
  const initial = await app.inject('/api/v1/admin/homepage');
  assert.equal(initial.statusCode, 200);
  assert.equal(initial.json().data.page.slug, 'home');
  assert.equal(initial.json().data.revision, 0);
  assert.equal(initial.json().data.source, 'published');

  const draftTranslations = translations('Draft');
  const saved = await app.inject({ method: 'PUT', url: '/api/v1/admin/homepage/draft', payload: { baseRevision: 0, translations: draftTranslations } });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().data.revision, 1);
  assert.equal(saved.json().data.source, 'draft');
  assert.equal(repository.current.page.status, 'PUBLISHED');
  assert.equal(repository.audits.length, 1);
  assert.deepEqual({ action: repository.audits[0]?.action, revision: repository.audits[0]?.revision, source: repository.audits[0]?.source }, { action: 'SAVE_DRAFT', revision: 1, source: 'draft' });
  assert.equal(repository.audits[0]?.actor.actorId, actorId);
  assert.match(repository.audits[0]?.actor.ipHash ?? '', /^[a-f0-9]{64}$/);
  await app.close();
});

test('保存与已发布内容完全相同的草稿立即返回 published source', async () => {
  const { app, repository } = await setup();
  const sameContent = translations();
  const saved = await app.inject({ method: 'PUT', url: '/api/v1/admin/homepage/draft', payload: { baseRevision: 0, translations: sameContent } });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().data.revision, 1);
  assert.equal(saved.json().data.source, 'published');
  assert.equal(repository.audits[0]?.source, 'published');
  await app.close();
});

test('PUT 严格拒绝旧 baseRevision、单语言及不完整首页', async () => {
  const { app, repository } = await setup();
  repository.latestRevision = 4;
  const stale = await app.inject({ method: 'PUT', url: '/api/v1/admin/homepage/draft', payload: { baseRevision: 3, translations: translations('Draft') } });
  assert.equal(stale.statusCode, 409);
  assert.equal(stale.json().error.details.currentRevision, 4);

  const oneLocale = await app.inject({ method: 'PUT', url: '/api/v1/admin/homepage/draft', payload: { baseRevision: 4, translations: [translations()[0]] } });
  assert.equal(oneLocale.statusCode, 422);
  await app.close();
});

test('POST publish 仅 ADMIN 可用，要求 latest revision，并映射失效媒体错误', async () => {
  const editor = await setup('EDITOR');
  assert.equal((await editor.app.inject('/api/v1/admin/homepage')).statusCode, 200);
  assert.equal((await editor.app.inject({
    method: 'PUT',
    url: '/api/v1/admin/homepage/draft',
    payload: { baseRevision: 0, translations: translations('Editor Draft') },
  })).statusCode, 200);
  const forbidden = await editor.app.inject({ method: 'POST', url: '/api/v1/admin/homepage/publish', payload: { revision: 1 } });
  assert.equal(forbidden.statusCode, 403);
  await editor.app.close();

  const { app, repository } = await setup('ADMIN');
  repository.latestRevision = 2;
  repository.current = state({ revision: 2, source: 'draft', translations: translations('Draft') });
  const stale = await app.inject({ method: 'POST', url: '/api/v1/admin/homepage/publish', payload: { revision: 1 } });
  assert.equal(stale.statusCode, 409);
  assert.equal(stale.json().error.details.currentRevision, 2);

  repository.publishError = new HomepageRevisionNotFoundError(3);
  const missing = await app.inject({ method: 'POST', url: '/api/v1/admin/homepage/publish', payload: { revision: 3 } });
  assert.equal(missing.statusCode, 404);
  repository.publishError = new HomepageInactiveMediaError([assetId]);
  const inactive = await app.inject({ method: 'POST', url: '/api/v1/admin/homepage/publish', payload: { revision: 2 } });
  assert.equal(inactive.statusCode, 422);
  assert.deepEqual(inactive.json().error.details.assetIds, [assetId]);
  repository.publishError = undefined;

  const published = await app.inject({ method: 'POST', url: '/api/v1/admin/homepage/publish', payload: { revision: 2 } });
  assert.equal(published.statusCode, 200);
  assert.equal(published.json().data.source, 'published');
  assert.equal(repository.audits.length, 1);
  assert.deepEqual({ action: repository.audits[0]?.action, revision: repository.audits[0]?.revision, source: repository.audits[0]?.source }, { action: 'PUBLISH', revision: 2, source: 'published' });
  await app.close();
});
