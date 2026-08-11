import { config } from '../config.js';
import { mediaRepository } from './repository.js';
import { MediaService } from './service.js';
import { LocalStorageAdapter } from './storage.js';

export const mediaStorage = new LocalStorageAdapter(config.UPLOAD_DIR, config.PUBLIC_BASE_URL);
export const mediaService = new MediaService(mediaRepository, mediaStorage);
