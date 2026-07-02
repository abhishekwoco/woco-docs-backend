import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import type { MulterFile } from '../rag/types';
import {
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
} from './uploads.constants';

const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  /**
   * Persist an uploaded image to local disk and return its public URL path.
   *
   * Returns a RELATIVE url (e.g. "/uploads/images/<uuid>.png") so it is
   * origin-agnostic: the frontend proxies /uploads/* to this backend, so the
   * same path works whether the markdown is rendered in the admin editor, a
   * published doc page, or the chat widget.
   */
  saveImage(file: MulterFile): { url: string; filename: string; size: number } {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image type "${file.mimetype}". Allowed: PNG, JPEG, GIF, WebP.`,
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.`,
      );
    }

    // Derive the extension from the server-side mime map ONLY — never from the
    // user-supplied filename. Uploads are served inline on the app origin, so a
    // user-controlled extension (.html/.svg/.xml) would enable stored XSS.
    const ext = MIME_EXT[file.mimetype] || '.bin';

    const filename = `${randomUUID()}${ext}`;
    const dir = join(UPLOADS_DIR, 'images');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), file.buffer);

    const url = `${UPLOADS_URL_PREFIX}/images/${filename}`;
    this.logger.log(`Saved image ${filename} (${file.size} bytes) → ${url}`);
    return { url, filename, size: file.size };
  }
}
