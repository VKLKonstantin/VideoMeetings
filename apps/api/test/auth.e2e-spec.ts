import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface AuthResponse {
  user: { id: string; email: string; createdAt: string };
  token: string;
}

interface ErrorResponse {
  message: string;
}

const credentials = { email: 'auth-e2e@example.com', password: 'correcthorse' };

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/login — тест #1', () => {
    it('logs in with the correct credentials and returns a usable token (200)', async () => {
      const server = app.getHttpServer();
      await request(server)
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      const response = await request(server)
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      const body = response.body as AuthResponse;
      expect(body.user.email).toBe(credentials.email);
      expect(body.token).toBe(body.user.id);
    });

    it('is case-insensitive on email', async () => {
      const server = app.getHttpServer();
      await request(server)
        .post('/auth/register')
        .send({ ...credentials, email: 'Mixed-Case@Example.com' })
        .expect(201);

      await request(server)
        .post('/auth/login')
        .send({ ...credentials, email: 'mixed-case@example.com' })
        .expect(200);
    });

    it('rejects a wrong password (401)', async () => {
      const server = app.getHttpServer();
      await request(server)
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      await request(server)
        .post('/auth/login')
        .send({ ...credentials, password: 'wrong password' })
        .expect(401);
    });

    it('rejects an email that was never registered (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever1' })
        .expect(401);
    });

    it("doesn't reveal whether the email exists (identical error for both cases)", async () => {
      const server = app.getHttpServer();
      await request(server)
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      const wrongPassword = await request(server)
        .post('/auth/login')
        .send({ ...credentials, password: 'wrong password' })
        .expect(401);

      const unknownEmail = await request(server)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever1' })
        .expect(401);

      const wrongPasswordBody = wrongPassword.body as ErrorResponse;
      const unknownEmailBody = unknownEmail.body as ErrorResponse;
      expect(wrongPasswordBody.message).toBe(unknownEmailBody.message);
    });

    it.each([
      ['missing password', { email: credentials.email }],
      ['malformed email', { ...credentials, email: 'not-an-email' }],
    ])('rejects a payload with %s (400)', async (_case, payload) => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(payload)
        .expect(400);
    });
  });
});
