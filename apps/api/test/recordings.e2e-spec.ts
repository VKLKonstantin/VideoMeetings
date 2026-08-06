import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/auth.guard';
import { AuthenticatedRequest } from '../src/auth/authenticated-request';

/**
 * Same fake as meetings.e2e-spec.ts: `Authorization: Bearer <userId>`
 * authenticates as that user, no real token issuer needed.
 */
class FakeAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    (req as AuthenticatedRequest).user = {
      id: header.slice('Bearer '.length),
    };
    return true;
  }
}

const authHeader = (userId: string) => ({ Authorization: `Bearer ${userId}` });

interface MeetingResponse {
  id: string;
}

interface RecordingResponse {
  id: string;
  meetingId: string;
  filename: string;
  size: number;
  format: string;
  status: string;
  uploadedAt: string;
}

const validMeetingPayload = {
  title: 'Sprint planning',
  date: '2026-08-01T10:00:00.000Z',
  participants: ['alice@example.com'],
};

/** Minimal RIFF/WAVE header — enough for the magic-byte sniff, doesn't need to be a playable file. */
function wavBuffer(sizeBytes = 1024): Buffer {
  const buf = Buffer.alloc(sizeBytes);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(sizeBytes - 8, 4);
  buf.write('WAVE', 8, 'ascii');
  return buf;
}

describe('RecordingsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue(new FakeAuthGuard())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createMeeting(userId: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/meetings')
      .set(authHeader(userId))
      .send(validMeetingPayload)
      .expect(201);
    return (response.body as MeetingResponse).id;
  }

  describe('POST /meetings/:id/recordings — тест #1', () => {
    it('uploads a valid recording and it appears in the list (201)', async () => {
      const meetingId = await createMeeting('user-1');
      const server = app.getHttpServer();

      const uploadResponse = await request(server)
        .post(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .attach('file', wavBuffer(), {
          filename: 'call.wav',
          contentType: 'audio/wav',
        })
        .expect(201);

      const recording = uploadResponse.body as RecordingResponse;
      expect(recording.meetingId).toBe(meetingId);
      expect(recording.filename).toBe('call.wav');
      expect(recording.format).toBe('wav');
      expect(recording.status).toBe('uploaded');
      expect(
        (recording as { storedPath?: unknown }).storedPath,
      ).toBeUndefined();

      const listResponse = await request(server)
        .get(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .expect(200);

      const recordings = listResponse.body as RecordingResponse[];
      expect(recordings.map((r) => r.id)).toContain(recording.id);
    });

    it('accepts multiple recordings for the same meeting, listed independently', async () => {
      const meetingId = await createMeeting('user-1');
      const server = app.getHttpServer();

      await request(server)
        .post(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .attach('file', wavBuffer(), {
          filename: 'part-1.wav',
          contentType: 'audio/wav',
        })
        .expect(201);

      await request(server)
        .post(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .attach('file', wavBuffer(), {
          filename: 'part-2.wav',
          contentType: 'audio/wav',
        })
        .expect(201);

      const listResponse = await request(server)
        .get(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .expect(200);

      const recordings = listResponse.body as RecordingResponse[];
      expect(recordings).toHaveLength(2);
      expect(recordings.map((r) => r.filename).sort()).toEqual([
        'part-1.wav',
        'part-2.wav',
      ]);
    });

    it('rejects an unsupported file format without saving it (400)', async () => {
      const meetingId = await createMeeting('user-1');
      const server = app.getHttpServer();

      await request(server)
        .post(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .attach('file', Buffer.from('%PDF-1.4 not a recording'), {
          filename: 'notes.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      const listResponse = await request(server)
        .get(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .expect(200);

      expect(listResponse.body).toEqual([]);
    });

    it('rejects a file whose content does not match its declared mimetype, without saving it (400)', async () => {
      const meetingId = await createMeeting('user-1');
      const server = app.getHttpServer();

      // Passes the mimetype pre-filter (audio/wav is allowed) but the bytes
      // aren't a real WAV/MP3/OGG/MP4/MOV/WebM — exercises the magic-byte
      // sniff in file-signature.util.ts, not just the fileFilter layer.
      await request(server)
        .post(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .attach(
          'file',
          Buffer.from('this is plain text, not a real audio file'),
          { filename: 'fake.wav', contentType: 'audio/wav' },
        )
        .expect(400);

      const listResponse = await request(server)
        .get(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .expect(200);

      expect(listResponse.body).toEqual([]);
    });

    it('rejects a file exceeding the maximum size without saving it (400)', async () => {
      const meetingId = await createMeeting('user-1');
      const server = app.getHttpServer();

      const maxSize = Number(process.env.RECORDING_MAX_SIZE_BYTES);
      await request(server)
        .post(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .attach('file', wavBuffer(maxSize + 1), {
          filename: 'too-big.wav',
          contentType: 'audio/wav',
        })
        .expect(400);

      const listResponse = await request(server)
        .get(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .expect(200);

      expect(listResponse.body).toEqual([]);
    });

    it("returns 404 for another user's meeting (no existence leak)", async () => {
      const meetingId = await createMeeting('user-1');

      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-2'))
        .attach('file', wavBuffer(), {
          filename: 'call.wav',
          contentType: 'audio/wav',
        })
        .expect(404);
    });

    it('rejects requests without authentication (401)', async () => {
      const meetingId = await createMeeting('user-1');

      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/recordings`)
        .attach('file', wavBuffer(), {
          filename: 'call.wav',
          contentType: 'audio/wav',
        })
        .expect(401);
    });
  });

  describe('GET /meetings/:id/recordings — тест #2', () => {
    it('isolates recordings by meeting owner (404 for a different user)', async () => {
      const meetingId = await createMeeting('user-1');
      const server = app.getHttpServer();

      await request(server)
        .post(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-1'))
        .attach('file', wavBuffer(), {
          filename: 'call.wav',
          contentType: 'audio/wav',
        })
        .expect(201);

      await request(server)
        .get(`/meetings/${meetingId}/recordings`)
        .set(authHeader('user-2'))
        .expect(404);
    });

    it('returns 404 for a meeting that does not exist', async () => {
      await request(app.getHttpServer())
        .get('/meetings/00000000-0000-0000-0000-000000000000/recordings')
        .set(authHeader('user-1'))
        .expect(404);
    });

    it('rejects requests without authentication (401)', async () => {
      const meetingId = await createMeeting('user-1');

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/recordings`)
        .expect(401);
    });
  });
});
