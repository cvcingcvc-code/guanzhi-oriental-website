import type { FastifyPluginAsync } from 'fastify';
import { localeSchema, parseContentDocument } from '../content/contract.js';
import { publicContentRepository, type PublicContentRepository } from '../content/repository.js';
import { buildPublicContentPage, buildPublicSettings, mediaAssetIds } from '../content/public-dto.js';
import { HttpError, parse } from '../lib/http.js';
import { mediaStorage } from '../media/index.js';

export function createContentRoutes(repository: PublicContentRepository, resolvePublicMediaUrl = (storageKey: string) => mediaStorage.publicUrl(storageKey)): FastifyPluginAsync {
  return async (app) => {
    app.get('/content/pages/:slug', {
      schema: {
        tags: ['公共内容'],
        summary: '读取经过内容协议验证的已发布页面',
        params: { type: 'object', required: ['slug'], properties: { slug: { type: 'string' } } },
        querystring: { type: 'object', properties: { locale: { type: 'string', enum: ['zh-CN', 'en'], default: 'zh-CN' } } },
      },
    }, async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const locale = parse(localeSchema, (request.query as { locale?: string }).locale ?? 'zh-CN');
      const row = await repository.findPublishedPage(slug, locale);
      if (!row) return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: '页面不存在、尚未发布或缺少该语言版本' } });
      const document = parseContentDocument(slug, row.blocks);
      const assets = await repository.findMediaAssets(mediaAssetIds(document));
      const data = buildPublicContentPage(row, document, assets, resolvePublicMediaUrl);
      return { ok: true, data };
    });

    app.get('/content/settings', {
      schema: { tags: ['公共内容'], summary: '读取允许公开的站点设置' },
    }, async () => ({ ok: true, data: buildPublicSettings(await repository.listSettings()) }));
  };
}

const routes = createContentRoutes(publicContentRepository);
export default routes;
