import { mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { detectMediaFormat } from './file-signature.util';

async function fileWith(bytes: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'file-signature-test-'));
  const filePath = join(dir, 'sample');
  await writeFile(filePath, bytes);
  return filePath;
}

describe('detectMediaFormat', () => {
  it('identifies a WAV file from its RIFF/WAVE header', async () => {
    const buf = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.write('WAVE', 8, 'ascii');
    await expect(detectMediaFormat(await fileWith(buf))).resolves.toBe('wav');
  });

  it('identifies an OGG file from its OggS header', async () => {
    await expect(
      detectMediaFormat(await fileWith(Buffer.from('OggS' + 'rest'))),
    ).resolves.toBe('ogg');
  });

  it('returns null for content matching no known signature', async () => {
    await expect(
      detectMediaFormat(await fileWith(Buffer.from('just some text'))),
    ).resolves.toBeNull();
  });

  it('returns null for a file too short to contain any signature, without false-matching on zero-padding', async () => {
    // Regression test: detectMediaFormat used to check the allocated read
    // buffer's length (always 64) instead of the number of bytes actually
    // read, so a truncated file was compared as if it were fully populated.
    await expect(
      detectMediaFormat(await fileWith(Buffer.from([0x52, 0x49]))), // "RI" only
    ).resolves.toBeNull();
  });

  it('returns null for an empty file', async () => {
    await expect(
      detectMediaFormat(await fileWith(Buffer.alloc(0))),
    ).resolves.toBeNull();
  });
});
