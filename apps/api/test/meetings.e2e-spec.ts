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
 * Replaces the real AuthGuard for these tests so we don't depend on a real
 * token issuer. A request is "authenticated" when it carries
 * `Authorization: Bearer <userId>`; that userId becomes `request.user.id`.
 * Requests without the header are rejected (mirrors the 401 the real guard
 * must produce).
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
  title: string;
  date: string;
  participants: string[];
}

const validMeetingPayload = {
  title: 'Sprint planning',
  date: '2026-08-01T10:00:00.000Z',
  participants: ['alice@example.com', 'bob@example.com'],
};

describe('MeetingsController (e2e)', () => {
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

  describe('POST /meetings — тест #1', () => {
    it('creates a meeting and returns it with a generated id (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/meetings')
        .set(authHeader('user-1'))
        .send(validMeetingPayload)
        .expect(201);

      const meeting = response.body as MeetingResponse;
      expect(meeting).toMatchObject(validMeetingPayload);
      expect(typeof meeting.id).toBe('string');
      expect(meeting.id.length).toBeGreaterThan(0);
    });

    it('rejects requests without authentication (401)', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .send(validMeetingPayload)
        .expect(401);
    });

    it.each([
      ['title', { ...validMeetingPayload, title: '' }],
      ['date', { ...validMeetingPayload, date: 'not-a-date' }],
      [
        'participants',
        { ...validMeetingPayload, participants: 'not-an-array' },
      ],
    ])('rejects an invalid %s (400)', async (_field, payload) => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set(authHeader('user-1'))
        .send(payload)
        .expect(400);
    });

    it('rejects a payload missing required fields (400)', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set(authHeader('user-1'))
        .send({ title: 'No date or participants' })
        .expect(400);
    });
  });

  describe('GET /meetings — тест #2', () => {
    it("returns only the current user's meetings (200)", async () => {
      const server = app.getHttpServer();

      const ownMeeting = await request(server)
        .post('/meetings')
        .set(authHeader('user-1'))
        .send({ ...validMeetingPayload, title: 'My meeting' })
        .expect(201);

      await request(server)
        .post('/meetings')
        .set(authHeader('user-2'))
        .send({ ...validMeetingPayload, title: "Someone else's meeting" })
        .expect(201);

      const response = await request(server)
        .get('/meetings')
        .set(authHeader('user-1'))
        .expect(200);

      const meetings = response.body as MeetingResponse[];
      const ownMeetingBody = ownMeeting.body as MeetingResponse;
      expect(Array.isArray(meetings)).toBe(true);
      const titles = meetings.map((m) => m.title);
      expect(titles).toContain('My meeting');
      expect(titles).not.toContain("Someone else's meeting");
      expect(meetings.find((m) => m.id === ownMeetingBody.id)).toBeDefined();
    });

    it('returns an empty list for a user with no meetings (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/meetings')
        .set(authHeader('user-with-no-meetings'))
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('rejects requests without authentication (401)', async () => {
      await request(app.getHttpServer()).get('/meetings').expect(401);
    });
  });

  describe('GET /meetings/:id — тест #3', () => {
    it('returns the meeting when it exists and belongs to the user (200)', async () => {
      const server = app.getHttpServer();
      const created = await request(server)
        .post('/meetings')
        .set(authHeader('user-1'))
        .send(validMeetingPayload)
        .expect(201);
      const createdMeeting = created.body as MeetingResponse;

      const response = await request(server)
        .get(`/meetings/${createdMeeting.id}`)
        .set(authHeader('user-1'))
        .expect(200);

      const meeting = response.body as MeetingResponse;
      expect(meeting).toMatchObject(validMeetingPayload);
      expect(meeting.id).toBe(createdMeeting.id);
    });

    it('returns 404 for an id that does not exist', async () => {
      await request(app.getHttpServer())
        .get('/meetings/00000000-0000-0000-0000-000000000000')
        .set(authHeader('user-1'))
        .expect(404);
    });

    it('returns 404 for a meeting that belongs to a different user', async () => {
      const server = app.getHttpServer();
      const created = await request(server)
        .post('/meetings')
        .set(authHeader('user-1'))
        .send(validMeetingPayload)
        .expect(201);
      const createdMeeting = created.body as MeetingResponse;

      await request(server)
        .get(`/meetings/${createdMeeting.id}`)
        .set(authHeader('user-2'))
        .expect(404);
    });

    it('rejects requests without authentication (401)', async () => {
      await request(app.getHttpServer())
        .get('/meetings/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });
  });
});
