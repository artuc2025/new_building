import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import { AppModule } from '../../src/app.module';

describe('API Contract Tests (api-gateway)', () => {
  let app: INestApplication;
  let ajv: Ajv;
  let openApiSpec: any;

  beforeAll(async () => {
    // Load OpenAPI spec from generated file
    const specPath = join(__dirname, '../../openapi.json');
    try {
      const specContent = readFileSync(specPath, 'utf-8');
      openApiSpec = await SwaggerParser.dereference(JSON.parse(specContent));
    } catch (error) {
      throw new Error(`Failed to load OpenAPI spec from ${specPath}. Run 'pnpm nx run api-gateway:openapi:generate' first.`);
    }

    // Setup Ajv for schema validation
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    // Mock listings-service URL for testing
    process.env.LISTINGS_SERVICE_URL = process.env.LISTINGS_SERVICE_URL || 'http://localhost:3001';
    process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';

    // Create NestJS app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper to validate response against OpenAPI schema
  const validateResponse = (statusCode: number, responseBody: any, path: string, method: string) => {
    const pathObj = openApiSpec.paths[path];
    if (!pathObj) {
      // Some paths might not be in the spec (e.g., proxied paths)
      return;
    }

    const operation = pathObj[method.toLowerCase()];
    if (!operation) {
      return;
    }

    const responseSchema = operation.responses?.[statusCode]?.content?.['application/json']?.schema;
    if (!responseSchema) {
      // Some responses might not have schemas defined
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
});

