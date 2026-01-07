import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpModule, HttpService } from '@nestjs/axios';
import * as request from 'supertest';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../../src/app.module';

describe('API Gateway Listings Contract Tests', () => {
  let app: INestApplication;
  let ajv: Ajv;
  let openapiSpec: any;
  let httpService: HttpService;

  beforeAll(async () => {
    // Load OpenAPI spec
    const specPath = join(__dirname, '../../openapi.json');
    openapiSpec = JSON.parse(readFileSync(specPath, 'utf-8'));

    // Initialize Ajv
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);

    // Create NestJS app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, HttpModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    httpService = moduleFixture.get<HttpService>(HttpService);
    
    // Apply global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false, // Allow pass-through to services
      }),
    );

    // Setup Swagger
    const config = new DocumentBuilder()
      .setTitle('API Gateway')
      .setVersion('1.0')
      .build();
    SwaggerModule.createDocument(app, config);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/buildings', () => {
    it('should forward request and return 200 with valid schema', async () => {
      // Mock successful response from listings service
      const mockResponse: AxiosResponse = {
        data: {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          meta: {
            currency: 'AMD',
            exchangeRate: 1.0,
            sort: 'date_desc',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const response = await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: 1, limit: 20 })
        .expect(200);

      const responseSchema = openapiSpec.paths['/api/v1/buildings']?.get?.responses?.['200']?.content?.['application/json']?.schema;
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const valid = validate(response.body);
        if (!valid) {
          console.error('Validation errors:', validate.errors);
        }
        expect(valid).toBe(true);
      }
    });

    it('should normalize 5xx upstream errors to 503 with error envelope', async () => {
      // Mock 500 error from listings service
      const mockError: AxiosError = {
        response: {
          data: { message: 'Internal server error' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
        code: 'ERR_BAD_RESPONSE',
        config: {} as any,
      };

      jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => mockError));

      const response = await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .expect(503);

      // Validate error envelope
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode', 503);
    });

    it('should forward error envelope from upstream service', async () => {
      // Mock 404 error with error envelope from listings service
      const mockResponse: AxiosResponse = {
        data: {
          error: {
            code: 'NOT_FOUND',
            message: 'Building not found',
            details: { buildingId: '123' },
            requestId: 'test-request-id',
            statusCode: 404,
          },
        },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const response = await request(app.getHttpServer())
        .get('/api/v1/buildings/123')
        .expect(404);

      // Validate error envelope is forwarded correctly
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.requestId).toBe('test-request-id');
    });
  });

  describe('POST /api/v1/admin/buildings', () => {
    it('should forward request with admin header and return 201', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          data: {
            id: 'test-id',
            title: { en: 'New Building' },
            address: { en: 'Address' },
            location: { lat: 40.1811, lng: 44.5091 },
            floors: 10,
            areaMin: 60,
            areaMax: 120,
            currency: 'AMD',
            developerId: 'dev-id',
            regionId: 'region-id',
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send({
          title: { en: 'New Building' },
          address: { en: 'Address' },
          location: { lat: 40.1811, lng: 44.5091 },
          floors: 10,
          areaMin: 60,
          areaMax: 120,
          developerId: 'dev-id',
          regionId: 'region-id',
        })
        .expect(201);

      // Verify admin header was forwarded
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-admin-key': 'test-admin-key',
          }),
        }),
      );

      const responseSchema = openapiSpec.paths['/api/v1/admin/buildings']?.post?.responses?.['201']?.content?.['application/json']?.schema;
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const valid = validate(response.body);
        if (!valid) {
          console.error('Validation errors:', validate.errors);
        }
        expect(valid).toBe(true);
      }
    });
  });
});

