import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FALLBACK_HOME_ZH,
  FALLBACK_SETTINGS,
  parseHomeContent,
  isPublicSiteSettings,
  loadHomeContent,
  loadHomeContentOrFallback,
  loadSiteSettingsOrFallback,
  switchHomeLocale,
  type HomeContent,
} from './public-content';

describe('FALLBACK_HOME_ZH 完整性', () => {
  it('包含七种唯一 block 且顺序正确', () => {
    const types = FALLBACK_HOME_ZH.blocks.map((block) => block.type);
    expect(types).toEqual(['hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact']);
  });

  it('byType 快捷字段与 blocks 一致', () => {
    expect(FALLBACK_HOME_ZH.hero?.type).toBe('hero');
    expect(FALLBACK_HOME_ZH.contact?.type).toBe('contact');
    expect(FALLBACK_HOME_ZH.blocks.length).toBe(7);
  });

  it('媒体引用全部指向存在的 webp 资源', () => {
    const urls: string[] = [];
    for (const block of FALLBACK_HOME_ZH.blocks) {
      if ('media' in block && block.media) {
        urls.push(block.media.url);
        if (block.media.poster) urls.push(block.media.poster.url);
      }
    }
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.startsWith('/images/') || url.startsWith('/videos/')).toBe(true);
      if (url.startsWith('/images/')) expect(url).toMatch(/\.webp$|\.svg$/);
    }
  });

  it('所有 fallback 媒体的 mimeType 与扩展名匹配', () => {
    for (const block of FALLBACK_HOME_ZH.blocks) {
      if (!('media' in block) || !block.media) continue;
      const check = (url: string, mimeType?: string) => {
        if (!mimeType) return;
        if (url.endsWith('.webp')) expect(mimeType).toBe('image/webp');
        if (url.endsWith('.svg')) expect(mimeType).toBe('image/svg+xml');
        if (url.endsWith('.mp4')) expect(mimeType).toBe('video/mp4');
      };
      check(block.media.url, block.media.mimeType);
      if (block.media.poster) check(block.media.poster.url, block.media.poster.mimeType);
    }
  });
});

describe('parseHomeContent 校验', () => {
  it('接受完整合法响应并按 order 排序', () => {
    const parsed = parseHomeContent({
      version: 1,
      locale: 'zh-CN',
      title: '观止东方',
      seo: { title: 't', description: 'd' },
      blocks: FALLBACK_HOME_ZH.blocks,
    });
    expect(parsed.blocks[0]!.type).toBe('hero');
    expect(parsed.hero).toBeDefined();
    expect(parsed.seo.title).toBe('t');
  });

  it('拒绝 locale 不匹配的响应', () => {
    expect(() =>
      parseHomeContent({ version: 1, locale: 'en', title: 'x', seo: { title: null, description: null }, blocks: FALLBACK_HOME_ZH.blocks }, 'zh-CN'),
    ).toThrow('locale mismatch');
  });

  it('拒绝 block 数量超限', () => {
    const blocks = [...FALLBACK_HOME_ZH.blocks, { ...FALLBACK_HOME_ZH.blocks[0]! }];
    expect(() =>
      parseHomeContent({ version: 1, locale: 'zh-CN', title: 'x', seo: { title: null, description: null }, blocks }),
    ).toThrow();
  });

  it('拒绝重复 block（同类型出现两次）', () => {
    const duplicated = [FALLBACK_HOME_ZH.blocks[0]!, { ...FALLBACK_HOME_ZH.blocks[0]! }];
    expect(() =>
      parseHomeContent({ version: 1, locale: 'zh-CN', title: 'x', seo: { title: null, description: null }, blocks: duplicated }),
    ).toThrow('order or uniqueness');
  });

  it('拒绝乱序 block（order 与 expected 序不一致）', () => {
    // about(order 20) 在 hero(order 10) 之前到达：交换两者的 order 使排序后 about 先出现
    const hero = FALLBACK_HOME_ZH.blocks[0]!;
    const about = FALLBACK_HOME_ZH.blocks[1]!;
    const swapped = [
      { ...hero, order: 20 },
      { ...about, order: 10 },
      ...FALLBACK_HOME_ZH.blocks.slice(2),
    ];
    expect(() =>
      parseHomeContent({ version: 1, locale: 'zh-CN', title: 'x', seo: { title: null, description: null }, blocks: swapped }),
    ).toThrow('order or uniqueness');
  });

  it('拒绝非对象与错误版本', () => {
    expect(() => parseHomeContent(null)).toThrow();
    expect(() => parseHomeContent({ version: 2, locale: 'zh-CN', title: 'x', seo: {}, blocks: [] })).toThrow();
  });
});

describe('isPublicSiteSettings', () => {
  it('接受完整 fallback settings', () => {
    expect(isPublicSiteSettings(FALLBACK_SETTINGS)).toBe(true);
  });

  it('拒绝错误版本与非法 locales', () => {
    expect(isPublicSiteSettings({ ...FALLBACK_SETTINGS, version: 2 })).toBe(false);
    expect(isPublicSiteSettings({ ...FALLBACK_SETTINGS, locales: ['fr'] })).toBe(false);
    expect(isPublicSiteSettings(null)).toBe(false);
  });
});

describe('API 加载与 fallback 行为', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const okEnvelope = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ ok: true, data }) });

  it('loadHomeContent 请求正确 URL 并解析 envelope', async () => {
    fetchMock.mockResolvedValueOnce(okEnvelope(FALLBACK_HOME_ZH));
    const content = await loadHomeContent('zh-CN', new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/content/pages/home?locale=zh-CN',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(content.hero?.type).toBe('hero');
  });

  it('loadHomeContentOrFallback 在 API 500 时返回中文 fallback', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const content = await loadHomeContentOrFallback(new AbortController().signal);
    expect(content.locale).toBe('zh-CN');
    expect(content.hero?.type).toBe('hero');
  });

  it('loadSiteSettingsOrFallback 在网络失败时返回 settings fallback', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const settings = await loadSiteSettingsOrFallback(new AbortController().signal);
    expect(settings.brand.name?.['zh-CN']).toBe('观止东方');
  });

  it('switchHomeLocale 成功时原子替换、失败时保留当前内容', async () => {
    const current: HomeContent = FALLBACK_HOME_ZH;
    fetchMock.mockResolvedValueOnce(okEnvelope({ ...FALLBACK_HOME_ZH, locale: 'en', title: 'Guanzhi Oriental' }));
    const success = await switchHomeLocale(current, 'en', new AbortController().signal);
    expect(success.failed).toBe(false);
    expect(success.content.locale).toBe('en');

    fetchMock.mockRejectedValueOnce(new Error('boom'));
    const failed = await switchHomeLocale(current, 'en', new AbortController().signal);
    expect(failed.failed).toBe(true);
    expect(failed.content).toBe(current);
  });
});
