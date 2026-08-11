import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { HttpError } from '../lib/http.js';
import type { MediaAsset, MediaRepository } from './repository.js';
import type { StorageAdapter } from './storage.js';

export type MediaCategory = 'image' | 'video' | 'pdf';

export const MEDIA_LIMITS: Record<MediaCategory, number> = {
  image: 12 * 1024 * 1024,
  pdf: 20 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};
export const MAX_MEDIA_UPLOAD_BYTES = Math.max(...Object.values(MEDIA_LIMITS));

const allowed = {
  'image/jpeg': { extension: 'jpg', category: 'image' },
  'image/png': { extension: 'png', category: 'image' },
  'image/webp': { extension: 'webp', category: 'image' },
  'image/avif': { extension: 'avif', category: 'image' },
  'video/mp4': { extension: 'mp4', category: 'video' },
  'application/pdf': { extension: 'pdf', category: 'pdf' },
} as const satisfies Record<string, { extension: string; category: MediaCategory }>;

export type NewMediaAsset = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  altZh?: string;
  altEn?: string;
  category: string;
  uploadedBy: string;
};

export type MediaUpload = {
  data: Uint8Array;
  declaredMimeType: string;
  originalName: string;
  altZh?: string;
  altEn?: string;
  uploadedBy: string;
};

export type AdminMediaDto = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: { 'zh-CN'?: string; en?: string };
  category: string | null;
  createdAt: string;
  url: string;
  usage: { referenced: boolean; deletable: boolean };
};

function looksLikeSvg(data: Uint8Array) {
  const head = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, 2048)).replace(/^\uFEFF/, '').trimStart();
  return /^(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(head);
}

async function inspect(data: Uint8Array, declaredMimeType: string) {
  if (looksLikeSvg(data) || declaredMimeType.toLowerCase() === 'image/svg+xml') throw new HttpError(415, '首期 CMS 禁止上传 SVG');
  const detected = await fileTypeFromBuffer(data);
  const supported = detected ? allowed[detected.mime as keyof typeof allowed] : undefined;
  if (!detected || !supported) throw new HttpError(415, '文件内容不是受支持的 JPEG、PNG、WebP、AVIF、MP4 或 PDF');
  if (declaredMimeType.toLowerCase() !== detected.mime) throw new HttpError(415, `文件声明类型与真实内容不一致（真实类型：${detected.mime}）`);
  if (data.byteLength > MEDIA_LIMITS[supported.category]) throw new HttpError(413, `${supported.category} 文件超过 ${MEDIA_LIMITS[supported.category] / 1024 / 1024} MiB 限制`);
  let width: number | undefined;
  let height: number | undefined;
  if (supported.category === 'image') {
    const metadata = await sharp(data, { failOn: 'error', limitInputPixels: 100_000_000 }).metadata();
    width = metadata.width;
    height = metadata.height;
    if (!width || !height) throw new HttpError(415, '无法读取图片尺寸');
  }
  return { mimeType: detected.mime, extension: supported.extension, category: supported.category, width, height };
}

function safeOriginalName(name: string) {
  return path.basename(name.replaceAll('\\', '/')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'upload';
}

export class MediaService {
  constructor(private readonly repository: MediaRepository, private readonly storage: StorageAdapter) {}

  private async dto(row: MediaAsset): Promise<AdminMediaDto> {
    const referenced = await this.repository.isReferenced(row.id);
    return {
      id: row.id,
      name: row.originalName,
      mimeType: row.mimeType,
      size: row.sizeBytes,
      width: row.width,
      height: row.height,
      alt: { ...(row.altZh ? { 'zh-CN': row.altZh } : {}), ...(row.altEn ? { en: row.altEn } : {}) },
      category: row.category,
      createdAt: row.createdAt.toISOString(),
      url: this.storage.publicUrl(row.storageKey),
      usage: { referenced, deletable: !referenced },
    };
  }

  async list() {
    return Promise.all((await this.repository.listActive()).map((row) => this.dto(row)));
  }

  async upload(input: MediaUpload) {
    const metadata = await inspect(input.data, input.declaredMimeType);
    const storageKey = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${metadata.extension}`;
    await this.storage.put(storageKey, input.data);
    let row: MediaAsset;
    try {
      row = await this.repository.create({
        storageKey,
        originalName: safeOriginalName(input.originalName),
        mimeType: metadata.mimeType,
        sizeBytes: input.data.byteLength,
        width: metadata.width,
        height: metadata.height,
        altZh: input.altZh,
        altEn: input.altEn,
        category: metadata.category,
        uploadedBy: input.uploadedBy,
      });
    } catch (error) {
      await this.storage.delete(storageKey);
      throw error;
    }
    return this.dto(row);
  }

  async delete(id: string) {
    const row = await this.repository.findActive(id);
    if (!row) throw new HttpError(404, '媒体不存在');
    if (await this.repository.isReferenced(id)) throw new HttpError(409, '媒体正在被页面内容引用，不能删除');
    await this.repository.softDelete(id);
    return row;
  }
}
