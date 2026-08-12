import { HOME_BLOCK_ORDER, type AdminHomepageData, type AdminMediaAsset, type AdminUser, type HomepageTranslation } from './types';

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error?: { message?: string; details?: unknown } };

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    throw new AdminApiError(0, '无法连接服务器，请检查 API 是否运行。');
  }
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload || payload.ok !== true) {
    const failure = payload && payload.ok === false ? payload.error : undefined;
    throw new AdminApiError(response.status, failure?.message ?? `请求失败（${response.status}）`, failure?.details);
  }
  return payload.data;
}

export async function login(email: string, password: string) {
  const data = await request<unknown>('/api/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!isRecord(data) || !isNonEmptyString(data.token) || !isNonEmptyString(data.expiresIn)) {
    throw new AdminApiError(500, '登录 API 返回了无效数据。');
  }
  return { token: data.token, expiresIn: data.expiresIn, user: parseAdminUser(data.user) };
}

export async function getMe(token: string) {
  return parseAdminUser(await request<unknown>('/api/v1/admin/auth/me', {}, token));
}

export async function loadHomepage(token: string) {
  return parseHomepageData(await request<unknown>('/api/v1/admin/homepage', {}, token));
}

export async function saveHomepageDraft(token: string, baseRevision: number, translations: HomepageTranslation[]) {
  return parseHomepageData(await request<unknown>('/api/v1/admin/homepage/draft', {
    method: 'PUT',
    body: JSON.stringify({ baseRevision, translations }),
  }, token));
}

export async function publishHomepage(token: string, revision: number) {
  return parseHomepageData(await request<unknown>('/api/v1/admin/homepage/publish', {
    method: 'POST',
    body: JSON.stringify({ revision }),
  }, token));
}

export async function loadMedia(token: string) {
  const data = await request<unknown>('/api/v1/admin/media', {}, token);
  if (!Array.isArray(data) || !data.every(isAdminMediaAsset)) throw new AdminApiError(500, 'Media API 返回了无效数据。');
  return data;
}

export async function uploadMedia(token: string, file: File, altZh: string, altEn: string) {
  const query = new URLSearchParams();
  if (altZh.trim()) query.set('altZh', altZh.trim());
  if (altEn.trim()) query.set('altEn', altEn.trim());
  const body = new FormData();
  body.set('file', file);
  const data = await request<unknown>(`/api/v1/admin/media?${query}`, { method: 'POST', body }, token);
  if (!isAdminMediaAsset(data)) throw new AdminApiError(500, 'Media API 返回了无效数据。');
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string';
}

function isFiniteInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
}

function parseAdminUser(value: unknown): AdminUser {
  if (!isRecord(value)) throw new AdminApiError(500, '认证 API 返回了无效用户。');
  const id = typeof value.id === 'string' ? value.id : value.sub;
  const displayName = typeof value.displayName === 'string' ? value.displayName : value.name;
  if (
    !isNonEmptyString(id)
    || !isNonEmptyString(value.email)
    || !/^\S+@\S+\.\S+$/.test(value.email)
    || !isNonEmptyString(displayName)
    || (value.role !== 'ADMIN' && value.role !== 'EDITOR')
  ) throw new AdminApiError(500, '认证 API 返回了无效用户。');
  return { id, email: value.email, displayName, role: value.role };
}

function isLocalizedAlt(value: unknown) {
  return isRecord(value) && isNonEmptyString(value['zh-CN']) && (value.en === undefined || typeof value.en === 'string');
}

function isMediaReference(value: unknown): boolean {
  if (!isRecord(value) || (!isNonEmptyString(value.assetId) && !isNonEmptyString(value.fallbackUrl)) || !isLocalizedAlt(value.alt)) return false;
  if (!isOptionalString(value.mimeType)) return false;
  if (value.width !== undefined && (!isFiniteInteger(value.width) || (value.width as number) <= 0)) return false;
  if (value.height !== undefined && (!isFiniteInteger(value.height) || (value.height as number) <= 0)) return false;
  return value.poster === undefined || isMediaReference(value.poster);
}

function isCta(value: unknown) {
  return isRecord(value)
    && isNonEmptyString(value.label)
    && (value.action === 'scroll' || value.action === 'inquiry' || value.action === 'link')
    && isNonEmptyString(value.target);
}

function isStringArray(value: unknown, min = 1) {
  return Array.isArray(value) && value.length >= min && value.every(isNonEmptyString);
}

function isBase(value: Record<string, unknown>, type: string) {
  return value.type === type
    && typeof value.enabled === 'boolean'
    && isFiniteInteger(value.order)
    && (value.contentStatus === 'approved' || value.contentStatus === 'draft');
}

function isItemBase(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && /^[a-z0-9-]+$/.test(value.id)
    && typeof value.enabled === 'boolean'
    && isFiniteInteger(value.order);
}

function isHomeBlock(value: unknown): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.type) || !isBase(value, value.type)) return false;
  if (value.type === 'hero') return isNonEmptyString(value.eyebrow)
    && isStringArray(value.headingLines)
    && (value.emphasisLine === undefined || isFiniteInteger(value.emphasisLine))
    && isNonEmptyString(value.description)
    && isCta(value.primaryCta)
    && (value.secondaryCta === undefined || isCta(value.secondaryCta))
    && isMediaReference(value.media)
    && (value.meta === undefined || (isRecord(value.meta) && isNonEmptyString(value.meta.brandCode) && isNonEmptyString(value.meta.locationAndYear)));
  if (value.type === 'about') return isNonEmptyString(value.lead)
    && isStringArray(value.headingLines)
    && isStringArray(value.paragraphs)
    && (value.statement === undefined || (isRecord(value.statement) && isNonEmptyString(value.statement.value) && isNonEmptyString(value.statement.text)));
  if (value.type === 'capabilities') return isStringArray(value.headingLines)
    && isNonEmptyString(value.intro)
    && Array.isArray(value.items)
    && value.items.length > 0
    && value.items.every((item) => isItemBase(item) && isNonEmptyString(item.number) && isNonEmptyString(item.title) && isNonEmptyString(item.description));
  if (value.type === 'motifs') return isStringArray(value.headingLines)
    && isNonEmptyString(value.intro)
    && Array.isArray(value.items)
    && value.items.length > 0
    && value.items.every((item) => isItemBase(item) && isNonEmptyString(item.title) && isNonEmptyString(item.titleEn) && isNonEmptyString(item.description) && isNonEmptyString(item.status) && isMediaReference(item.media));
  if (value.type === 'jiangnan') return isStringArray(value.headingLines)
    && isNonEmptyString(value.description)
    && (value.cta === undefined || isCta(value.cta))
    && isMediaReference(value.media);
  if (value.type === 'partners') return isNonEmptyString(value.heading)
    && Array.isArray(value.items)
    && value.items.length > 0
    && value.items.every((item) => isItemBase(item) && isNonEmptyString(item.title) && isOptionalString(item.description) && isMediaReference(item.media));
  if (value.type === 'contact') return isNonEmptyString(value.kicker)
    && isStringArray(value.headingLines)
    && isOptionalString(value.description)
    && isCta(value.cta);
  return false;
}

function isHomepageTranslation(value: unknown): value is HomepageTranslation {
  if (!isRecord(value)
    || (value.locale !== 'zh-CN' && value.locale !== 'en')
    || !isNonEmptyString(value.title)
    || !isOptionalString(value.seoTitle)
    || !isOptionalString(value.seoDescription)
    || !isRecord(value.blocks)
    || value.blocks.version !== 1
    || !Array.isArray(value.blocks.blocks)
  ) return false;
  const types = value.blocks.blocks.map((block) => isRecord(block) ? block.type : undefined);
  return value.blocks.blocks.length === HOME_BLOCK_ORDER.length
    && value.blocks.blocks.every(isHomeBlock)
    && types.every((type, index) => type === HOME_BLOCK_ORDER[index]);
}

function isAdminMediaAsset(value: unknown): value is AdminMediaAsset {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.mimeType)
    && typeof value.size === 'number'
    && value.size >= 0
    && (value.width === null || (isFiniteInteger(value.width) && (value.width as number) > 0))
    && (value.height === null || (isFiniteInteger(value.height) && (value.height as number) > 0))
    && isRecord(value.alt)
    && (value.alt['zh-CN'] === undefined || typeof value.alt['zh-CN'] === 'string')
    && (value.alt.en === undefined || typeof value.alt.en === 'string')
    && (value.category === null || typeof value.category === 'string')
    && isNonEmptyString(value.createdAt)
    && isNonEmptyString(value.url)
    && isRecord(value.usage)
    && typeof value.usage.referenced === 'boolean'
    && typeof value.usage.deletable === 'boolean';
}

function parseHomepageData(value: unknown): AdminHomepageData {
  if (!value || typeof value !== 'object') throw new AdminApiError(500, 'Homepage API 返回了无效数据。');
  const candidate = value as Partial<AdminHomepageData>;
  const parsedTranslations = Array.isArray(candidate.translations) ? candidate.translations.filter(isHomepageTranslation) : [];
  const localeSet = new Set(parsedTranslations.map((translation) => translation.locale));
  const validTranslations = parsedTranslations.length === 2
    && candidate.translations?.length === 2
    && localeSet.size === 2
    && localeSet.has('zh-CN')
    && localeSet.has('en');
  if (
    candidate.page?.slug !== 'home'
    || (candidate.page.status !== 'DRAFT' && candidate.page.status !== 'PUBLISHED')
    || !isNonEmptyString(candidate.page.id)
    || (candidate.page.publishedAt !== null && !isNonEmptyString(candidate.page.publishedAt))
    || !isNonEmptyString(candidate.page.updatedAt)
    || !Number.isInteger(candidate.revision)
    || (candidate.revision as number) < 0
    || (candidate.savedAt !== null && !isNonEmptyString(candidate.savedAt))
    || (candidate.source !== 'published' && candidate.source !== 'draft')
    || !validTranslations
  ) {
    throw new AdminApiError(500, 'Homepage API 数据不符合固定双语七区块协议。');
  }
  return candidate as AdminHomepageData;
}
