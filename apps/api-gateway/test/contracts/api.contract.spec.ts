import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import { of } from 'rxjs';
import { AppModule } from '../../src/app.module';

describe('API Contract Tests (api-gateway)', () => {
  let app: INestApplication;
  let ajv: Ajv;
  let openApiSpec: any;
  let httpService: HttpService;

  // Sprint 2 endpoints that MUST be in the OpenAPI spec
  const SPRINT_2_ENDPOINTS = [
    { path: '/api/v1/buildings', method: 'GET' },
    { path: '/api/v1/buildings/{id}', method: 'GET' },
    { path: '/api/v1/buildings', method: 'POST' },
    { path: '/api/v1/buildings/{id}', method: 'PUT' },
    { path: '/api/v1/buildings/{id}', method: 'DELETE' },
  ];

  beforeAll(async () => {
    // Load OpenAPI spec from generated file
    // Use process.cwd() because tests run with cwd = apps/api-gateway when using pnpm --filter
    const specPath = join(process.cwd(), 'openapi.json');
    try {
      const specContent = readFileSync(specPath, 'utf-8');
      openApiSpec = await SwaggerParser.dereference(JSON.parse(specContent));
    } catch (error) {
      throw new Error(`Failed to load OpenAPI spec from ${specPath}. Run 'pnpm nx run api-gateway:openapi:generate' first.`);
    }

    // Verify Sprint 2 endpoints are in the spec
    for (const endpoint of SPRINT_2_ENDPOINTS) {
      const pathObj = openApiSpec.paths[endpoint.path];
      if (!pathObj) {
        throw new Error(`Sprint 2 endpoint missing from OpenAPI spec: ${endpoint.method} ${endpoint.path}`);
      }
      const operation = pathObj[endpoint.method.toLowerCase()];
      if (!operation) {
        throw new Error(`Sprint 2 endpoint missing from OpenAPI spec: ${endpoint.method} ${endpoint.path}`);
      }
    }

    // Setup Ajv for schema validation
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    // Mock listings-service URL for testing
    process.env.LISTINGS_SERVICE_URL = process.env.LISTINGS_SERVICE_URL || 'http://localhost:3001';
    process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';

    // Create NestJS app with mocked HttpService
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        request: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();

    httpService = moduleFixture.get<HttpService>(HttpService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper to validate response against OpenAPI schema
  const validateResponse = (statusCode: number, responseBody: any, path: string, method: string) => {
    const pathObj = openApiSpec.paths[path];
    if (!pathObj) {
      // For Sprint 2 endpoints, this is a failure
      const isSprint2Endpoint = SPRINT_2_ENDPOINTS.some(
        (e) => e.path === path && e.method === method,
      );
      if (isSprint2Endpoint) {
        throw new Error(`Sprint 2 endpoint missing from OpenAPI spec: ${method} ${path}`);
      }
      // For other paths, silently return (e.g., proxied paths)
      return;
    }

    const operation = pathObj[method.toLowerCase()];
    if (!operation) {
      // For Sprint 2 endpoints, this is a failure
      const isSprint2Endpoint = SPRINT_2_ENDPOINTS.some(
        (e) => e.path === path && e.method === method,
      );
      if (isSprint2Endpoint) {
        throw new Error(`Sprint 2 endpoint missing from OpenAPI spec: ${method} ${path}`);
      }
      return;
    }

    const responseSchema = operation.responses?.[statusCode]?.content?.['application/json']?.schema;
    if (!responseSchema) {
      // For Sprint 2 endpoints, missing schema is a failure
      const isSprint2Endpoint = SPRINT_2_ENDPOINTS.some(
        (e) => e.path === path && e.method === method,
      );
      if (isSprint2Endpoint && (statusCode === 200 || statusCode === 201)) {
        throw new Error(`Sprint 2 endpoint missing response schema for ${statusCode}: ${method} ${path}`);
      }
      // For other responses, silently return
      return;
    }

    const validate = ajv.compile(responseSchema);
    const valid = validate(responseBody);
    if (!valid) {
      console.error('Contract validation errors:', validate.errors);
      console.error('Response body:', JSON.stringify(responseBody, null, 2));
    }
    expect(valid).toBe(true);
  };

  describe('GET /api/v1/buildings', () => {
    it('should match OpenAPI schema for 200 response (if service available)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: 1, limit: 10 });

      // Accept 200 (service available) or 503 (service unavailable)
      expect([200, 503]).toContain(response.status);

      if (response.status === 200) {
        // Validate response envelope shape
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);

        // Validate against OpenAPI schema
        validateResponse(200, response.body, '/api/v1/buildings', 'GET');
      } else if (response.status === 503) {
        // Validate error envelope for service unavailable
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error).toHaveProperty('requestId');
        expect(response.body.error).toHaveProperty('statusCode');
        expect(response.body.error.statusCode).toBe(503);
      }
    });

    it('should return 400 for invalid query parameters and validate error schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: -1, limit: 200 });

      // Gateway should validate or proxy validation error
      expect([400, 503]).toContain(response.status);

      if (response.status === 400) {
        // Validate error envelope shape
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error).toHaveProperty('requestId');
        expect(response.body.error).toHaveProperty('statusCode');
      }
    });
  });

  describe('GET /api/v1/buildings/:id', () => {
    it('should match OpenAPI schema for 200 response (if service available)', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/buildings/${testId}`);

      // Accept 200 (found), 404 (not found), or 503 (service unavailable)
      expect([200, 404, 503]).toContain(response.status);

      if (response.status === 200) {
        // Validate response envelope shape
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');

        // Validate against OpenAPI schema
        validateResponse(200, response.body, '/api/v1/buildings/{id}', 'GET');
      } else if (response.status === 404) {
        // Validate error envelope for not found
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error).toHaveProperty('requestId');
        expect(response.body.error).toHaveProperty('statusCode');
        expect(response.body.error.statusCode).toBe(404);
      } else if (response.status === 503) {
        // Validate error envelope for service unavailable
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error).toHaveProperty('requestId');
        expect(response.body.error).toHaveProperty('statusCode');
        expect(response.body.error.statusCode).toBe(503);
      }
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/buildings/invalid-uuid')
        .expect(400);

      // Validate error envelope shape
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode');
    });
  });

  describe('POST /api/v1/buildings', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should return 401 when missing x-admin-key', async () => {
      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
        developerId: '00000000-0000-0000-0000-000000000000',
        regionId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/buildings')
        .send(createDto)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should return 401 when x-admin-key is invalid', async () => {
      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
        developerId: '00000000-0000-0000-0000-000000000000',
        regionId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/buildings')
        .set('x-admin-key', 'wrong-key')
        .send(createDto)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 201 for happy path with valid x-admin-key', async () => {
      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
        developerId: '00000000-0000-0000-0000-000000000000',
        regionId: '00000000-0000-0000-0000-000000000000',
      };

      const mockResponse = {
        status: 201,
        data: {
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            title: { en: 'New Building' },
            address: { en: 'New Address' },
            location: { lat: 40.1811, lng: 44.5091 },
            floors: 5,
            areaMin: 60,
            areaMax: 120,
            currency: 'AMD',
            developerId: '00000000-0000-0000-0000-000000000000',
            regionId: '00000000-0000-0000-0000-000000000000',
            status: 'draft',
          },
        },
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse) as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/buildings')
        .set('x-admin-key', adminKey)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      validateResponse(201, response.body, '/api/v1/buildings', 'POST');
    });

    it('should return 400 for validation error', async () => {
      const invalidDto = {
        title: null, // Invalid
        floors: -1, // Invalid
      };

      const mockErrorResponse = {
        status: 400,
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            statusCode: 400,
          },
        },
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockErrorResponse) as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/buildings')
        .set('x-admin-key', adminKey)
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
    });
  });

  describe('PUT /api/v1/buildings/:id', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';
    const testId = '00000000-0000-0000-0000-000000000000';

    it('should return 401 when missing x-admin-key', async () => {
      const updateDto = {
        title: { en: 'Updated Building' },
      };

      await request(app.getHttpServer())
        .put(`/api/v1/buildings/${testId}`)
        .send(updateDto)
        .expect(401);
    });

    it('should return 200 for happy path with valid x-admin-key', async () => {
      const updateDto = {
        title: { en: 'Updated Building' },
      };

      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: testId,
            title: { en: 'Updated Building' },
            address: { en: 'New Address' },
            location: { lat: 40.1811, lng: 44.5091 },
            floors: 5,
            areaMin: 60,
            areaMax: 120,
            currency: 'AMD',
            developerId: '00000000-0000-0000-0000-000000000000',
            regionId: '00000000-0000-0000-0000-000000000000',
            status: 'draft',
          },
        },
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse) as any);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/buildings/${testId}`)
        .set('x-admin-key', adminKey)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      validateResponse(200, response.body, '/api/v1/buildings/{id}', 'PUT');
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/buildings/invalid-uuid')
        .set('x-admin-key', adminKey)
        .send({ title: { en: 'Updated' } })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/buildings/:id', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';
    const testId = '00000000-0000-0000-0000-000000000000';

    it('should return 401 when missing x-admin-key', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/buildings/${testId}`)
        .expect(401);
    });

    it('should return 200 for happy path with valid x-admin-key', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: testId,
            status: 'archived',
            deletedAt: new Date().toISOString(),
          },
        },
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse) as any);

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/buildings/${testId}`)
        .set('x-admin-key', adminKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      validateResponse(200, response.body, '/api/v1/buildings/{id}', 'DELETE');
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/buildings/invalid-uuid')
        .set('x-admin-key', adminKey)
        .expect(400);
    });
  });
});

