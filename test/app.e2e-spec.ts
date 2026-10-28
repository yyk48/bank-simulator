import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/create-app.js';

describe('Fastify application', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApp();
    app.useLogger(false);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves liveness through Fastify without a database', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json<unknown>()).toEqual({ status: 'ok' });
  });

  it('does not expose unimplemented bank operations', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/banks' });
    expect(response.statusCode).toBe(404);
  });
});
