import { Injectable } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { mkdir, rename, unlink } from 'fs/promises';
import { basename, join } from 'path';
import { RECORDINGS_ROOT, RECORDINGS_TMP_DIR } from './recordings.constants';

/**
 * Separates binary storage from the recordings metadata (RecordingsRepository),
 * mirroring how MeetingsRepository is already separate from meeting data
 * access. Local disk for now — swapping this for S3/MinIO later shouldn't
 * require touching the service/controller.
 */
@Injectable()
export class RecordingsStorage {
  async persist(tmpPath: string, meetingId: string): Promise<string> {
    const meetingDir = join(RECORDINGS_ROOT, meetingId);
    await mkdir(meetingDir, { recursive: true });
    const finalPath = join(meetingDir, basename(tmpPath));
    await rename(tmpPath, finalPath);
    return finalPath;
  }

  async discard(tmpPath: string): Promise<void> {
    await unlink(tmpPath).catch(() => undefined);
  }
}

export function ensureTmpDirSync(): void {
  mkdirSync(RECORDINGS_TMP_DIR, { recursive: true });
}
