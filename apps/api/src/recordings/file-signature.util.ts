import { open } from 'fs/promises';

export type DetectedMediaFormat =
  'mp3' | 'wav' | 'ogg' | 'mp4' | 'mov' | 'webm';

const SIGNATURE_READ_BYTES = 64;

/**
 * Identifies the real media format from the file's magic bytes rather than
 * trusting the client-supplied mimetype/extension (easily spoofed). Reads
 * only the first few bytes, not the whole file, so it stays cheap even for
 * large recordings.
 */
export async function detectMediaFormat(
  filePath: string,
): Promise<DetectedMediaFormat | null> {
  const buffer = Buffer.alloc(SIGNATURE_READ_BYTES);
  const handle = await open(filePath, 'r');
  try {
    await handle.read(buffer, 0, SIGNATURE_READ_BYTES, 0);
  } finally {
    await handle.close();
  }
  return matchSignature(buffer);
}

function matchSignature(buffer: Buffer): DetectedMediaFormat | null {
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS') {
    return 'ogg';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return 'wav';
  }

  if (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') {
    return 'mp3';
  }

  // MPEG frame sync without an ID3 tag: 11111111 111xxxxx
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return 'mp3';
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return 'webm';
  }

  // ISO base media container (mp4/mov): "ftyp" box at offset 4, brand at offset 8.
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).trim();
    return brand === 'qt' ? 'mov' : 'mp4';
  }

  return null;
}
