import { join } from 'path';

/**
 * Root directory for locally-stored uploads (images, etc.).
 *
 * The system is hosted on an internal local machine, so we deliberately use
 * the host's own disk for storage. Override with the UPLOADS_DIR env var to
 * point at a different volume; defaults to <cwd>/uploads.
 *
 * Served statically at /uploads/* (see main.ts). Images land in
 * <UPLOADS_DIR>/images and resolve to /uploads/images/<file>.
 */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.trim()
    ? process.env.UPLOADS_DIR.trim()
    : join(process.cwd(), 'uploads');

/** Public URL prefix the static middleware serves uploads under. */
export const UPLOADS_URL_PREFIX = '/uploads';

/**
 * Allowed image content types for the image upload endpoint.
 * SVG is deliberately excluded: it can embed scripts and uploads are served
 * inline on the app origin, so allowing it would enable stored XSS.
 */
export const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

/** Max image size in bytes (8 MB). */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
