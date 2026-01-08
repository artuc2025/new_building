import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';

describe('Buildings API Integration Tests (api-gateway)', () => {
  let gatewayApp: INestApplication;
  let ajv: Ajv;
  let openApiSpec: any;
  let httpService: HttpService;
  let mockHttpServiceRequest: jest.Mock;

  beforeAll(async () => {
    process.env.LISTINGS_SERVICE_URL = process.env.LISTINGS_SERVICE_URL || 'http://localhost:3001';
    process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';

    // Create mock HttpService
    mockHttpServiceRequest = jest.fn();

    // Start api-gateway with mocked HttpService
    const gatewayModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        request: mockHttpServiceRequest,
      })
      .compile();

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

    httpService = gatewayModuleFixture.get<HttpService>(HttpService);

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

  beforeEach(() => {
    jest.clearAllMocks();
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
      const mockResponse = {
        status: 200,
        data: {
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
          meta: {
            currency: 'AMD',
            exchangeRate: 1.0,
            sort: 'date_desc',
          },
        },
      };

      mockHttpServiceRequest.mockReturnValue(of(mockResponse));

      const response = await request(gatewayApp.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(mockHttpServiceRequest).toHaveBeenCalled();
      validateResponse(200, response.body, '/api/v1/buildings', 'GET');
    });

    it('should return 400 for invalid query parameters', async () => {
      const mockErrorResponse = {
        status: 400,
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: { fields: [{ message: 'page must be a positive number' }] },
            statusCode: 400,
          },
        },
      };

      mockHttpServiceRequest.mockReturnValue(of(mockErrorResponse));

      const response = await request(gatewayApp.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: -1, limit: 200 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(mockHttpServiceRequest).toHaveBeenCalled();
    });

    it('should return 503 when upstream service is unavailable', async () => {
      const axiosError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
        response: undefined,
      } as AxiosError;

      mockHttpServiceRequest.mockReturnValue(throwError(() => axiosError));

      const response = await request(gatewayApp.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: 1, limit: 10 })
        .expect(503);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('GET /api/v1/buildings/:id', () => {
    it('should proxy request and return building details (happy path)', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';
      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: testId,
            title: { en: 'Test Building' },
            address: { en: 'Test Address' },
          },
        },
      };

      mockHttpServiceRequest.mockReturnValue(of(mockResponse));

      const response = await request(gatewayApp.getHttpServer())
        .get(`/api/v1/buildings/${testId}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(testId);
      expect(mockHttpServiceRequest).toHaveBeenCalled();
      validateResponse(200, response.body, '/api/v1/buildings/{id}', 'GET');
    });

    it('should return 404 when building not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const mockErrorResponse = {
        status: 404,
        data: {
          error: {
            code: 'BUILDING_NOT_FOUND',
            message: `Building with ID '${nonExistentId}' not found`,
            details: { buildingId: nonExistentId },
            statusCode: 404,
          },
        },
      };

      mockHttpServiceRequest.mockReturnValue(of(mockErrorResponse));

      const response = await request(gatewayApp.getHttpServer())
        .get(`/api/v1/buildings/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('BUILDING_NOT_FOUND');
      expect(mockHttpServiceRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/admin/buildings', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should proxy request and return created building (happy path)', async () => {
      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
      };

      const mockResponse = {
        status: 201,
        data: {
          data: {
            id: 'new-building-id',
            title: { en: 'New Building' },
            address: { en: 'New Address' },
          },
        },
      };

      mockHttpServiceRequest.mockReturnValue(of(mockResponse));

      const response = await request(gatewayApp.getHttpServer())
        .post('/api/v1/admin/buildings')
        .set('x-admin-key', adminKey)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.title.en).toBe('New Building');
      expect(mockHttpServiceRequest).toHaveBeenCalled();
      validateResponse(201, response.body, '/api/v1/admin/buildings', 'POST');
    });

    it('should return 401 for missing admin key', async () => {
      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
      };

      await request(gatewayApp.getHttpServer())
        .post('/api/v1/admin/buildings')
        .send(createDto)
        .expect(401);

      expect(mockHttpServiceRequest).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid admin key', async () => {
      const createDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 5,
        areaMin: 60,
        areaMax: 120,
      };

      await request(gatewayApp.getHttpServer())
        .post('/api/v1/admin/buildings')
        .set('x-admin-key', 'wrong-key')
        .send(createDto)
        .expect(401);

      expect(mockHttpServiceRequest).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/admin/buildings/:id', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should proxy request and return updated building (happy path)', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';
      const updateDto = {
        title: { en: 'Updated Building' },
      };

      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: testId,
            title: { en: 'Updated Building' },
          },
        },
      };

      mockHttpServiceRequest.mockReturnValue(of(mockResponse));

      const response = await request(gatewayApp.getHttpServer())
        .put(`/api/v1/admin/buildings/${testId}`)
        .set('x-admin-key', adminKey)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.title.en).toBe('Updated Building');
      expect(mockHttpServiceRequest).toHaveBeenCalled();
      validateResponse(200, response.body, '/api/v1/admin/buildings/{id}', 'PUT');
    });

    it('should return 401 for missing admin key', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';
      const updateDto = {
        title: { en: 'Updated Building' },
      };

      await request(gatewayApp.getHttpServer())
        .put(`/api/v1/admin/buildings/${testId}`)
        .send(updateDto)
        .expect(401);

      expect(mockHttpServiceRequest).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/admin/buildings/:id', () => {
    const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

    it('should proxy request and return deleted building (happy path)', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';

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

      mockHttpServiceRequest.mockReturnValue(of(mockResponse));

      const response = await request(gatewayApp.getHttpServer())
        .delete(`/api/v1/admin/buildings/${testId}`)
        .set('x-admin-key', adminKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe('archived');
      expect(mockHttpServiceRequest).toHaveBeenCalled();
      validateResponse(200, response.body, '/api/v1/admin/buildings/{id}', 'DELETE');
    });

    it('should return 401 for missing admin key', async () => {
      const testId = '00000000-0000-0000-0000-000000000000';

      await request(gatewayApp.getHttpServer())
        .delete(`/api/v1/admin/buildings/${testId}`)
        .expect(401);

      expect(mockHttpServiceRequest).not.toHaveBeenCalled();
    });
  });
});

