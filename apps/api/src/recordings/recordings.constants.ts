import { join } from 'path';

/**
 * Configurable via env so e2e tests can use a small limit instead of
 * allocating hundreds of MB per test run — see test/setup-env.ts.
 */
export const MAX_RECORDING_SIZE_BYTES = Number(
  process.env.RECORDING_MAX_SIZE_BYTES ?? 500 * 1024 * 1024,
);

// Pre-filter on the client-declared mimetype (cheap, rejects before any
// disk write). The authoritative check is the magic-byte sniff in
// file-signature.util.ts, run after the file is received.
export const ALLOWED_RECORDING_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'application/ogg',
  'audio/mp4',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export const RECORDINGS_ROOT = join(process.cwd(), 'storage', 'recordings');
export const RECORDINGS_TMP_DIR = join(RECORDINGS_ROOT, 'tmp');
