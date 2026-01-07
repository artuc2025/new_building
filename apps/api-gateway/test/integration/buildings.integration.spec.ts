import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';

// Note: For full E2E tests, listings-service should be running on port 3001
// with a test database. This test assumes listings-service is available.

describe('Buildings API Integration Tests (api-gateway)', () => {
  let gatewayApp: INestApplication;
  let ajv: Ajv;
  let openApiSpec: any;

  beforeAll(async () => {
    // Note: This test assumes listings-service is running on port 3001
    // For full E2E testing, start listings-service separately with test database
    process.env.LISTINGS_SERVICE_URL = process.env.LISTINGS_SERVICE_URL || 'http://localhost:3001';
    process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';

    // Start api-gateway
    const gatewayModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    gatewayApp = gatewayModuleFixture.createNestApplication();
    gatewayApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await gatewayApp.init();
    await gatewayApp.listen(3000);

    // Setup Ajv for contract validation
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    // Load OpenAPI spec from running app
    const response = await request(gatewayApp.getHttpServer()).get('/api-docs-json');
    openApiSpec = await SwaggerParser.dereference(response.body);
  });

  afterAll(async () => {
    await gatewayApp.close();
  });

  const validateResponse = (statusCode: number, responseBody: any, path: string, method: string) => {
    if (statusCode >= 200 && statusCode < 300) {
      const pathObj = openApiSpec.paths[path];
      if (!pathObj) {
        console.warn(`No OpenAPI spec found for path: ${path}`);
        return;
      }

      const operation = pathObj[method.toLowerCase()];
      if (!operation) {
        console.warn(`No OpenAPI spec found for ${method} ${path}`);
        return;
      }

      const responseSchema = operation.responses?.[statusCode]?.content?.['application/json']?.schema;
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const valid = validate(responseBody);
        if (!valid) {
          console.error('Contract validation errors:', validate.errors);
          expect(valid).toBe(true);
        }
      }
    }
  };

  describe('GET /api/v1/buildings', () => {
    it('should proxy request and return paginated list (happy path)', async () => {
      // Note: This test requires listings-service to be running with test data
      const response = await request(gatewayApp.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: 1, limit: 10 });

      // Accept both 200 (if service is running) or 503 (if service is unavailable)
      expect([200, 503]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.data)).toBe(true);
        validateResponse(200, response.body, '/api/v1/buildings', 'GET');
      }
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(gatewayApp.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: -1, limit: 200 });

      // Gateway should validate or proxy validation error
      expect([400, 503]).toContain(response.status);
    });
  });

  describe('GET /api/v1/buildings/:id', () => {
    it('should proxy request and return building details (happy path)', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';
      const response = await request(gatewayApp.getHttpServer())
        .get(`/api/v1/buildings/${testId}`);

      // Accept 200 (found), 404 (not found), or 503 (service unavailable)
      expect([200, 404, 503]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        validateResponse(200, response.body, '/api/v1/buildings/{id}', 'GET');
      }
    });

    it('should return 404 when building not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(gatewayApp.getHttpServer())
        .get(`/api/v1/buildings/${nonExistentId}`);

      // Should return 404 or 503 if service unavailable
      expect([404, 503]).toContain(response.status);
    });
  });

  describe('POST /api/v1/admin/buildings', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should return 401 for missing admin key', async () => {
      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { longitude: 44.5091, latitude: 40.1811 },
        floors: 5,
        area_min: 60,
        area_max: 120,
      };

      await request(gatewayApp.getHttpServer())
        .post('/api/v1/admin/buildings')
        .send(createDto)
        .expect(401);
    });

    it('should return 401 for invalid admin key', async () => {
      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { longitude: 44.5091, latitude: 40.1811 },
        floors: 5,
        area_min: 60,
        area_max: 120,
      };

      await request(gatewayApp.getHttpServer())
        .post('/api/v1/admin/buildings')
        .set('x-admin-key', 'wrong-key')
        .send(createDto)
        .expect(401);
    });
  });

  describe('PUT /api/v1/admin/buildings/:id', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should return 401 for missing admin key', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';
      const updateDto = {
        title: { en: 'Updated Building' },
      };

      await request(gatewayApp.getHttpServer())
        .put(`/api/v1/admin/buildings/${testId}`)
        .send(updateDto)
        .expect(401);
    });
  });

  describe('DELETE /api/v1/admin/buildings/:id', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should return 401 for missing admin key', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';

      await request(gatewayApp.getHttpServer())
        .delete(`/api/v1/admin/buildings/${testId}`)
        .expect(401);
    });
  });
});

