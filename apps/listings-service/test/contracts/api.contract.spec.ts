import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../../src/app.module';

describe('Listings Service API Contract Tests', () => {
  let app: INestApplication;
  let ajv: Ajv;
  let openapiSpec: any;

  beforeAll(async () => {
    // Set admin key for tests
    process.env.ADMIN_API_KEY = 'test-admin-key';

    // Load OpenAPI spec
    const specPath = join(__dirname, '../../openapi.json');
    openapiSpec = JSON.parse(readFileSync(specPath, 'utf-8'));

    // Initialize Ajv
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);

    // Create NestJS app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global validation pipe with transform
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Setup Swagger (for OpenAPI document generation)
    const config = new DocumentBuilder()
      .setTitle('Listings Service API')
      .setVersion('1.0')
      .build();
    SwaggerModule.createDocument(app, config);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/buildings', () => {
    it('should return 200 with valid schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ page: 1, limit: 20 })
        .expect(200);

      const responseSchema = openapiSpec.paths['/v1/buildings']?.get?.responses?.['200']?.content?.['application/json']?.schema;
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const valid = validate(response.body);
        if (!valid) {
          console.error('Validation errors:', validate.errors);
        }
        expect(valid).toBe(true);
      }
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ page: -1, limit: 200 })
        .expect(400);

      // Validate error envelope
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode');
    });
  });

  describe('GET /v1/buildings/:id', () => {
    it('should return 200 with valid schema for existing building', async () => {
      // First, create a building to test with
      const createResponse = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'Test Building' },
          address: { en: 'Test Address' },
          location: { lat: 40.1811, lng: 44.5091 },
          floors: 5,
          areaMin: 50,
          areaMax: 100,
          developerId: '00000000-0000-0000-0000-000000000001',
          regionId: '00000000-0000-0000-0000-000000000001',
        })
        .expect(201);

      const buildingId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/v1/buildings/${buildingId}`)
        .expect(200);

      const responseSchema = openapiSpec.paths['/v1/buildings/{id}']?.get?.responses?.['200']?.content?.['application/json']?.schema;
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const valid = validate(response.body);
        if (!valid) {
          console.error('Validation errors:', validate.errors);
        }
        expect(valid).toBe(true);
      }
    });

    it('should return 404 with valid schema for non-existent building', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/buildings/00000000-0000-0000-0000-000000000999')
        .expect(404);

      // Validate error envelope
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });

  describe('POST /v1/admin/buildings', () => {
    it('should return 201 with valid schema for valid request', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'New Building' },
          address: { en: 'New Address' },
          location: { lat: 40.1811, lng: 44.5091 },
          floors: 10,
          areaMin: 60,
          areaMax: 120,
          developerId: '00000000-0000-0000-0000-000000000001',
          regionId: '00000000-0000-0000-0000-000000000001',
        })
        .expect(201);

      const responseSchema = openapiSpec.paths['/v1/admin/buildings']?.post?.responses?.['201']?.content?.['application/json']?.schema;
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const valid = validate(response.body);
        if (!valid) {
          console.error('Validation errors:', validate.errors);
        }
        expect(valid).toBe(true);
      }
    });

    it('should return 400 with valid schema for invalid request', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'Invalid Building' },
          // Missing required fields
          floors: -1, // Invalid value
        })
        .expect(400);

      // Validate error envelope
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode', 400);
    });
  });

  describe('PUT /v1/admin/buildings/:id', () => {
    it('should return 200 with valid schema for valid update', async () => {
      // Create a building first
      const createResponse = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'Building to Update' },
          address: { en: 'Address' },
          location: { lat: 40.1811, lng: 44.5091 },
          floors: 5,
          areaMin: 50,
          areaMax: 100,
          developerId: '00000000-0000-0000-0000-000000000001',
          regionId: '00000000-0000-0000-0000-000000000001',
        })
        .expect(201);

      const buildingId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .put(`/v1/admin/buildings/${buildingId}`)
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'Updated Building' },
        })
        .expect(200);

      const responseSchema = openapiSpec.paths['/v1/admin/buildings/{id}']?.put?.responses?.['200']?.content?.['application/json']?.schema;
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const valid = validate(response.body);
        if (!valid) {
          console.error('Validation errors:', validate.errors);
        }
        expect(valid).toBe(true);
      }
    });

    it('should return 400 for invalid update data', async () => {
      // Create a building first
      const createResponse = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'Building' },
          address: { en: 'Address' },
          location: { lat: 40.1811, lng: 44.5091 },
          floors: 5,
          areaMin: 50,
          areaMax: 100,
          developerId: '00000000-0000-0000-0000-000000000001',
          regionId: '00000000-0000-0000-0000-000000000001',
        })
        .expect(201);

      const buildingId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .put(`/v1/admin/buildings/${buildingId}`)
        .set('x-admin-key', 'test-admin-key')
        .send({
          floors: -1, // Invalid value
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('statusCode', 400);
    });

    it('should return 404 for non-existent building', async () => {
      const response = await request(app.getHttpServer())
        .put('/v1/admin/buildings/00000000-0000-0000-0000-000000000999')
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'Updated' },
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });

  describe('DELETE /v1/admin/buildings/:id', () => {
    it('should return 200 with valid schema for successful deletion', async () => {
      // Create a building first
      const createResponse = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'Building to Delete' },
          address: { en: 'Address' },
          location: { lat: 40.1811, lng: 44.5091 },
          floors: 5,
          areaMin: 50,
          areaMax: 100,
          developerId: '00000000-0000-0000-0000-000000000001',
          regionId: '00000000-0000-0000-0000-000000000001',
        })
        .expect(201);

      const buildingId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .delete(`/v1/admin/buildings/${buildingId}`)
        .set('x-admin-key', 'test-admin-key')
        .expect(200);

      const responseSchema = openapiSpec.paths['/v1/admin/buildings/{id}']?.delete?.responses?.['200']?.content?.['application/json']?.schema;
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const valid = validate(response.body);
        if (!valid) {
          console.error('Validation errors:', validate.errors);
        }
        expect(valid).toBe(true);
      }
    });

    it('should return 404 for non-existent building', async () => {
      const response = await request(app.getHttpServer())
        .delete('/v1/admin/buildings/00000000-0000-0000-0000-000000000999')
        .set('x-admin-key', 'test-admin-key')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });
});

