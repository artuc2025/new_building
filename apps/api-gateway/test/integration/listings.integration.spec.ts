import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import * as request from 'supertest';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AppModule } from '../../src/app.module';

describe('API Gateway Listings Integration Tests', () => {
  let app: INestApplication;
  let httpService: HttpService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, HttpModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    httpService = moduleFixture.get<HttpService>(HttpService);
    
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Request Forwarding', () => {
    it('should forward GET request with query parameters', async () => {
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
        .query({ page: 2, limit: 10, currency: 'USD' })
        .expect(200);

      // Verify request was forwarded with correct parameters
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/v1/buildings'),
          params: expect.objectContaining({
            page: '2',
            limit: '10',
            currency: 'USD',
          }),
        }),
      );

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should forward POST request with body and admin header', async () => {
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

      const requestBody = {
        title: { en: 'New Building' },
        address: { en: 'Address' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 10,
        areaMin: 60,
        areaMax: 120,
        developerId: 'dev-id',
        regionId: 'region-id',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send(requestBody)
        .expect(201);

      // Verify admin header was forwarded
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/v1/admin/buildings'),
          headers: expect.objectContaining({
            'x-admin-key': 'test-admin-key',
          }),
          data: requestBody,
        }),
      );

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe('test-id');
    });

    it('should forward PUT request with path parameter', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          data: {
            id: 'test-id',
            title: { en: 'Updated Building' },
            address: { en: 'Address' },
            location: { lat: 40.1811, lng: 44.5091 },
            floors: 12,
            areaMin: 60,
            areaMax: 120,
            currency: 'AMD',
            developerId: 'dev-id',
            regionId: 'region-id',
            status: 'draft',
            updatedAt: new Date().toISOString(),
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const response = await request(app.getHttpServer())
        .put('/api/v1/admin/buildings/test-id')
        .set('x-admin-key', 'test-admin-key')
        .send({ title: { en: 'Updated Building' }, floors: 12 })
        .expect(200);

      // Verify path parameter was forwarded
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: expect.stringContaining('/v1/admin/buildings/test-id'),
        }),
      );

      expect(response.body.data.floors).toBe(12);
    });
  });

  describe('Error Normalization', () => {
    it('should map 5xx upstream errors to 503 with error envelope', async () => {
      const { AxiosError } = require('axios');
      const mockError = new AxiosError('Internal server error');
      mockError.response = {
        data: { message: 'Internal server error' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };
      mockError.isAxiosError = true;
      mockError.code = 'ERR_BAD_RESPONSE';

      jest.spyOn(httpService, 'request').mockReturnValue(
        require('rxjs').throwError(() => mockError),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .expect(503);

      // Verify error envelope format
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode', 503);
    });

    it('should forward error envelope from upstream service', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          error: {
            code: 'NOT_FOUND',
            message: 'Building not found',
            details: { buildingId: '123' },
            requestId: 'upstream-request-id',
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

      // Verify error envelope is forwarded correctly
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.requestId).toBe('upstream-request-id');
      expect(response.body.error.statusCode).toBe(404);
    });
  });
});

