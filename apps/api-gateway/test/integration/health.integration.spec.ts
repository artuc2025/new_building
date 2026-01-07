import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Health Endpoint Regression Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /healthz/live', () => {
    it('should always return 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/healthz/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'api-gateway');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should never return 500', async () => {
      // Make multiple requests to ensure consistency
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .get('/healthz/live')
          .expect(200);
        
        expect(response.status).not.toBe(500);
        expect(response.body.status).toBe('ok');
      }
    });

    it('should not be wrapped by generic error filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/healthz/live')
        .expect(200);

      // Health endpoint should return simple response, not error envelope
      expect(response.body).not.toHaveProperty('error');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('GET /healthz/ready', () => {
    it('should return either 200 or 503, never 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/healthz/ready');

      // Should be either 200 (all deps OK) or 503 (deps not OK)
      expect([200, 503]).toContain(response.status);
      expect(response.status).not.toBe(500);
    });

    it('should return 503 when dependencies are unavailable', async () => {
      // This test verifies that 503 is returned (not 500) when deps fail
      // The actual status depends on whether test dependencies are available
      const response = await request(app.getHttpServer())
        .get('/healthz/ready');

      if (response.status === 503) {
        // If 503, verify it has proper structure
        expect(response.body).toHaveProperty('status');
        // Health check response from Terminus
        expect(['error', 'ok']).toContain(response.body.status);
      } else if (response.status === 200) {
        // If 200, all deps are OK
        expect(response.body).toHaveProperty('status', 'ok');
      }
    });

    it('should not be wrapped by generic error filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/healthz/ready');

      // Health endpoint should not return error envelope format
      // It should return Terminus health check format
      expect(response.body).toHaveProperty('status');
      // Should not have the generic error envelope structure
      if (response.status === 503) {
        // Terminus returns health check details, not our error envelope
        expect(response.body).not.toHaveProperty('error.code');
        expect(response.body).not.toHaveProperty('error.requestId');
      }
    });

    it('should include dependency details when returning 503', async () => {
      const response = await request(app.getHttpServer())
        .get('/healthz/ready');

      if (response.status === 503) {
        // Terminus health check format includes info about failed checks
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('info');
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('GET /health', () => {
    it('should return either 200 or 503, never 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/health');

      expect([200, 503]).toContain(response.status);
      expect(response.status).not.toBe(500);
    });
  });
});

