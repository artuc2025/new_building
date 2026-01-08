import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import { BuildingsModule } from '../../src/buildings/buildings.module';
import { SwaggerModule } from '../../src/swagger/swagger.module';
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../utils/test-db';
import { createTestDeveloper, createTestRegion, createTestBuilding } from '../utils/fixtures';
import { DataSource } from 'typeorm';

// Sprint 2 endpoints that MUST have response schemas for 200/201
const SPRINT_2_ENDPOINTS = [
  { path: '/v1/buildings', method: 'GET' },
  { path: '/v1/buildings/{id}', method: 'GET' },
  { path: '/v1/buildings', method: 'POST' },
  { path: '/v1/buildings/{id}', method: 'PUT' },
  { path: '/v1/buildings/{id}', method: 'DELETE' },
];

describe('API Contract Tests (listings-service)', () => {
  let app: INestApplication;
  let ajv: Ajv;
  let openApiSpec: any;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Setup test database
    dataSource = await setupTestDatabase();

    // Load OpenAPI spec from generated file
    // Use process.cwd() because tests run with cwd = apps/listings-service when running tests via pnpm --filter
    const specPath = join(process.cwd(), 'openapi.json');
    try {
      const specContent = readFileSync(specPath, 'utf-8');
      openApiSpec = await SwaggerParser.dereference(JSON.parse(specContent));
    } catch (error) {
      throw new Error(`Failed to load OpenAPI spec from ${specPath}. Run 'pnpm nx run listings-service:openapi:generate' first.`);
    }

    // Setup Ajv for schema validation
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    // Create NestJS app with test database connection
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: dataSource.options.host as string,
          port: dataSource.options.port as number,
          username: dataSource.options.username as string,
          password: dataSource.options.password as string,
          database: dataSource.options.database as string,
          schema: 'listings',
          synchronize: false,
          logging: false,
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/../../src/migrations/*{.ts,.js}'],
          migrationsTableName: 'typeorm_migrations',
          migrationsRun: false,
        }),
        BuildingsModule,
        SwaggerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  // Helper to validate response against OpenAPI schema
  const validateResponse = (statusCode: number, responseBody: any, path: string, method: string) => {
    const pathObj = openApiSpec.paths[path];
    if (!pathObj) {
      throw new Error(`No OpenAPI spec found for path: ${path}`);
    }

    const operation = pathObj[method.toLowerCase()];
    if (!operation) {
      throw new Error(`No OpenAPI spec found for ${method} ${path}`);
    }

    const responseSchema = operation.responses?.[statusCode]?.content?.['application/json']?.schema;
    
    // Check if this is a Sprint 2 endpoint requiring strict schema validation
    const isSprint2Endpoint = SPRINT_2_ENDPOINTS.some(
      (e) => e.path === path && e.method === method,
    );
    
    // For Sprint 2 endpoints, 200/201 responses MUST have schemas
    if (isSprint2Endpoint && (statusCode === 200 || statusCode === 201)) {
      if (!responseSchema) {
        throw new Error(
          `Sprint 2 endpoint ${method} ${path} with status ${statusCode} MUST have a response schema defined in OpenAPI spec`,
        );
      }
    }
    
    // For error responses (400, 401, 404), schemas are optional (permissive)
    if (!responseSchema) {
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

  describe('GET /v1/buildings', () => {
    it('should match OpenAPI schema for 200 response', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      await createTestBuilding(dataSource, developer.id, region.id, { status: 'published' });

      const response = await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Validate response envelope shape
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Validate against OpenAPI schema
      validateResponse(200, response.body, '/v1/buildings', 'GET');
    });

    it('should return 400 for invalid query parameters and validate error schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ page: -1, limit: 200 })
        .expect(400);

      // Validate error envelope shape
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode');
    });
  });

  describe('GET /v1/buildings/:id', () => {
    it('should match OpenAPI schema for 200 response', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      const building = await createTestBuilding(dataSource, developer.id, region.id);

      const response = await request(app.getHttpServer())
        .get(`/v1/buildings/${building.id}`)
        .expect(200);

      // Validate response envelope shape
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(building.id);

      // Validate against OpenAPI schema
      validateResponse(200, response.body, '/v1/buildings/{id}', 'GET');
    });

    it('should return 404 for non-existent building and validate error schema', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/v1/buildings/${nonExistentId}`)
        .expect(404);

      // Validate error envelope shape
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode');
      expect(response.body.error.statusCode).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/buildings/invalid-uuid')
        .expect(400);

      // Validate error envelope shape
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode');
    });
  });

  describe('POST /v1/buildings', () => {
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
        .post('/v1/buildings')
        .send(createDto)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 201 for happy path with valid x-admin-key', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);

      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
        developerId: developer.id,
        regionId: region.id,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/buildings')
        .set('x-admin-key', adminKey)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      validateResponse(201, response.body, '/v1/buildings', 'POST');
    });

    it('should return 400 for validation error', async () => {
      const invalidDto = {
        title: null, // Invalid
        floors: -1, // Invalid
      };

      const response = await request(app.getHttpServer())
        .post('/v1/buildings')
        .set('x-admin-key', adminKey)
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
    });
  });

  describe('PUT /v1/buildings/:id', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should return 401 when missing x-admin-key', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      const building = await createTestBuilding(dataSource, developer.id, region.id);

      const updateDto = {
        title: { en: 'Updated Building' },
      };

      await request(app.getHttpServer())
        .put(`/v1/buildings/${building.id}`)
        .send(updateDto)
        .expect(401);
    });

    it('should return 200 for happy path with valid x-admin-key', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      const building = await createTestBuilding(dataSource, developer.id, region.id);

      const updateDto = {
        title: { en: 'Updated Building' },
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/buildings/${building.id}`)
        .set('x-admin-key', adminKey)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      validateResponse(200, response.body, '/v1/buildings/{id}', 'PUT');
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .put('/v1/buildings/invalid-uuid')
        .set('x-admin-key', adminKey)
        .send({ title: { en: 'Updated' } })
        .expect(400);
    });
  });

  describe('DELETE /v1/buildings/:id', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should return 401 when missing x-admin-key', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      const building = await createTestBuilding(dataSource, developer.id, region.id);

      await request(app.getHttpServer())
        .delete(`/v1/buildings/${building.id}`)
        .expect(401);
    });

    it('should return 200 for happy path with valid x-admin-key', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      const building = await createTestBuilding(dataSource, developer.id, region.id);

      const response = await request(app.getHttpServer())
        .delete(`/v1/buildings/${building.id}`)
        .set('x-admin-key', adminKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      validateResponse(200, response.body, '/v1/buildings/{id}', 'DELETE');
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .delete('/v1/buildings/invalid-uuid')
        .set('x-admin-key', adminKey)
        .expect(400);
    });
  });
});

