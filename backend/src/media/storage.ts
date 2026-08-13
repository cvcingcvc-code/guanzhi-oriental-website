import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface StorageAdapter {
  put(key: string, data: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
  readonly localRoot?: string;
}

export function normalizedStorageKey(key: string) {
  const normalized = key.replaceAll('\\', '/');
  if (!/^[a-zA-Z0-9/_-]+\.[a-z0-9]+$/.test(normalized) || normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Invalid storage key');
  }
  return normalized;
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly localRoot: string;

  constructor(root: string, private readonly baseUrl: string) {
    this.localRoot = path.resolve(root);
  }

  private resolve(key: string) {
    const target = path.resolve(this.localRoot, normalizedStorageKey(key));
    if (target !== this.localRoot && !target.startsWith(`${this.localRoot}${path.sep}`)) throw new Error('Storage key escapes upload root');
    return target;
  }

  async put(key: string, data: Uint8Array) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: 'wx' });
  }

  async delete(key: string) {
    await unlink(this.resolve(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  publicUrl(key: string) {
    return `${this.baseUrl.replace(/\/$/, '')}/uploads/${normalizedStorageKey(key).split('/').map(encodeURIComponent).join('/')}`;
  }
}
