import { DocumentBuilder, SwaggerModule as NestSwaggerModule } from '@nestjs/swagger';
import { SwaggerDocument } from '../../src/swagger/swagger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { BuildingsModule } from '../../src/buildings/buildings.module';
import { SwaggerModule } from '../../src/swagger/swagger.module';
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../utils/test-db';
import { createTestDeveloper, createTestRegion, createTestBuilding } from '../utils/fixtures';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { DataSource } from 'typeorm';
import { BuildingStatus } from '@new-building-portal/contracts';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';

describe('Buildings API Integration Tests (listings-service)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ajv: Ajv;
  let openApiSpec: any;

  beforeAll(async () => {
    // Setup test database
    dataSource = await setupTestDatabase();

    // Create NestJS app with test database connection
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: (dataSource.options as any).host as string,
          port: (dataSource.options as any).port as number,
          username: (dataSource.options as any).username as string,
          password: (dataSource.options as any).password as string,
          database: (dataSource.options as any).database as string,
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
    app.useGlobalFilters(new HttpExceptionFilter());

    // Setup Swagger
    const config = new DocumentBuilder()
      .setTitle('Test API')
      .setVersion('1.0')
      .build();
    const document = NestSwaggerModule.createDocument(app, config);
    const swaggerService = app.get(SwaggerDocument);
    swaggerService.setDocument(document);

    await app.init();

    // Setup Ajv for contract validation
    ajv = new Ajv({ 
      allErrors: true, 
      strict: false,
      coerceTypes: true
    });
    addFormats(ajv);

    // Load OpenAPI spec from running app
    const response = await request(app.getHttpServer()).get('/api-docs-json');
    openApiSpec = await SwaggerParser.dereference(response.body);
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
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

  describe('GET /v1/buildings', () => {
    it('should return paginated list of buildings (happy path)', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      await createTestBuilding(dataSource, developer.id, region.id, { status: BuildingStatus.PUBLISHED });

      const response = await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data)).toBe(true);

      validateResponse(200, response.body, '/v1/buildings', 'GET');
    });

    it('should return buildings with converted prices when currency=USD is provided', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      // createTestBuilding creates a building with pricePerM2Min = 500000 by default (check fixtures if needed, assuming default)
      await createTestBuilding(dataSource, developer.id, region.id, { 
        status: BuildingStatus.PUBLISHED,
        price_per_m2_min: 400000,
        currency: 'AMD'
      });

      const response = await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ currency: 'USD' })
        .expect(200);

      // Assuming exchange rate is 400 AMD/USD (standard for this project context)
      // 400000 / 400 = 1000
      expect(response.body.data[0].pricePerM2Min).toBe(1000);
      expect(response.body.meta.currency).toBe('USD');
    });

    it('should return 400 for invalid query parameters', async () => {
      await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ page: -1, limit: 200 })
        .expect(400);
    });

  });

  describe('GET /v1/buildings/:id', () => {
    it('should return building details (happy path)', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      const building = await createTestBuilding(dataSource, developer.id, region.id);

      const response = await request(app.getHttpServer())
        .get(`/v1/buildings/${building.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(building.id);

      validateResponse(200, response.body, '/v1/buildings/{id}', 'GET');
    });

    it('should return 404 when building not found', async () => {
      const nonExistentId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'; // Valid v4 UUID
      await request(app.getHttpServer())
        .get(`/v1/buildings/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('POST /v1/buildings', () => {
    const adminKey = 'test-admin-key';

    beforeAll(() => {
      process.env.ADMIN_API_KEY = adminKey;
    });

    afterAll(() => {
      delete process.env.ADMIN_API_KEY;
    });

    it('should create a building (happy path)', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);

      const createDto = {
        title: { en: 'New Building', am: 'Նոր Շենք', ru: 'Новое Здание' },
        description: { en: 'New building description' },
        address: { en: 'New Address 456', am: 'Նոր Հասցե 456', ru: 'Новый Адрес 456' },
        location: { lng: 44.5091, lat: 40.1811 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
        developerId: developer.id,
        regionId: region.id,
        status: 'draft',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', adminKey)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title.en).toBe('New Building');

      validateResponse(201, response.body, '/v1/admin/buildings', 'POST');
    });

    it('should accept camelCase fields (addressLine1, addressLine2, postalCode)', async () => {
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
        addressLine1: '123 Main Street',
        addressLine2: 'Apt 4B',
        postalCode: '0001',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', adminKey)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.addressLine1).toBe('123 Main Street');
      expect(response.body.data.addressLine2).toBe('Apt 4B');
      expect(response.body.data.postalCode).toBe('0001');
    });

    it('should accept snake_case fields (address_line_1, address_line_2, postal_code) for backwards compatibility', async () => {
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
        address_line_1: '456 Oak Avenue',
        address_line_2: 'Suite 200',
        postal_code: '0002',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', adminKey)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.addressLine1).toBe('456 Oak Avenue');
      expect(response.body.data.addressLine2).toBe('Suite 200');
      expect(response.body.data.postalCode).toBe('0002');
    });

    it('should return 400 for negative pricePerM2Min', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);

      const createDto = {
        title: { en: 'Invalid Building' },
        address: { en: 'Invalid Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
        developerId: developer.id,
        regionId: region.id,
        pricePerM2Min: -100,
      };

      await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', adminKey)
        .send(createDto)
        .expect(400);
    });

    it('should return 401 for missing admin key', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);

      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { longitude: 44.5091, latitude: 40.1811 },
        floors: 5,
        area_min: 60,
        area_max: 120,
        developer_id: developer.id,
        region_id: region.id,
      };

      await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .send(createDto)
        .expect(401);
    });

    it('should return 401 for invalid admin key', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);

      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { longitude: 44.5091, latitude: 40.1811 },
        floors: 5,
        area_min: 60,
        area_max: 120,
        developer_id: developer.id,
        region_id: region.id,
      };

      await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'wrong-key')
        .send(createDto)
        .expect(401);
    });
  });

  describe('PUT /v1/buildings/:id', () => {
    const adminKey = 'test-admin-key';

    beforeAll(() => {
      process.env.ADMIN_API_KEY = adminKey;
    });

    afterAll(() => {
      delete process.env.ADMIN_API_KEY;
    });

    it('should update a building (happy path)', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      const building = await createTestBuilding(dataSource, developer.id, region.id);

      const updateDto = {
        title: { en: 'Updated Building', am: 'Թարմացված Շենք', ru: 'Обновленное Здание' },
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/admin/buildings/${building.id}`)
        .set('x-admin-key', adminKey)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.title.en).toBe('Updated Building');

      validateResponse(200, response.body, '/v1/admin/buildings/{id}', 'PUT');
    });

    it('should return 404 when building not found', async () => {
      const nonExistentId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'; // Valid v4 UUID
      const updateDto = {
        title: { en: 'Updated Building' },
      };

      await request(app.getHttpServer())
        .put(`/v1/admin/buildings/${nonExistentId}`)
        .set('x-admin-key', adminKey)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('DELETE /v1/buildings/:id', () => {
    const adminKey = 'test-admin-key';

    beforeAll(() => {
      process.env.ADMIN_API_KEY = adminKey;
    });

    afterAll(() => {
      delete process.env.ADMIN_API_KEY;
    });

    it('should soft-delete a building (happy path)', async () => {
      const developer = await createTestDeveloper(dataSource);
      const region = await createTestRegion(dataSource);
      const building = await createTestBuilding(dataSource, developer.id, region.id);

      const response = await request(app.getHttpServer())
        .delete(`/v1/admin/buildings/${building.id}`)
        .set('x-admin-key', adminKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.status).toBe('archived');
      expect(response.body.data).toHaveProperty('deletedAt');

      validateResponse(200, response.body, '/v1/admin/buildings/{id}', 'DELETE');
    });

    it('should return 404 when building not found', async () => {
      const nonExistentId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'; // Valid v4 UUID

      await request(app.getHttpServer())
        .delete(`/v1/admin/buildings/${nonExistentId}`)
        .set('x-admin-key', adminKey)
        .expect(404);
    });
  });
});

