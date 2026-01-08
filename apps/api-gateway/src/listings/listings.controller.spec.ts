import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ListingsController } from './listings.controller';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ListingsController (Public Endpoints)', () => {
  let controller: ListingsController;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    request: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        LISTINGS_SERVICE_URL: 'http://localhost:3001',
        LISTINGS_SERVICE_TIMEOUT: 10000,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingsController],
      providers: [
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<ListingsController>(ListingsController);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/buildings', () => {
    it('should proxy request to listings-service (happy path)', async () => {
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
        },
      };

      mockHttpService.request.mockReturnValue(of(mockResponse));

      const mockReq = {
        url: '/api/v1/buildings',
        headers: {},
        query: { page: 1, limit: 10 },
      } as any;

      const result = await controller.findAll(mockReq);

      expect(mockHttpService.request).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should normalize error responses', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: {
            message: 'Validation error',
            error: 'Bad Request',
          },
        },
      } as AxiosError;

      mockHttpService.request.mockReturnValue(throwError(() => axiosError));

      const mockReq = {
        url: '/api/v1/buildings',
        headers: {},
        query: {},
      } as any;

      await expect(controller.findAll(mockReq)).rejects.toThrow(HttpException);
    });
  });

  describe('GET /api/v1/buildings/:id', () => {
    it('should proxy request to listings-service (happy path)', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: 'building-1',
            title: { en: 'Test Building' },
          },
        },
      };

      mockHttpService.request.mockReturnValue(of(mockResponse));

      const mockReq = {
        url: '/api/v1/buildings/building-1',
        headers: {},
        query: {},
      } as any;

      const result = await controller.findOne('building-1', mockReq);

      expect(mockHttpService.request).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should return 404 when building not found', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: {
            message: 'Building not found',
            error: 'Not Found',
          },
        },
      } as AxiosError;

      mockHttpService.request.mockReturnValue(throwError(() => axiosError));

      const mockReq = {
        url: '/api/v1/buildings/non-existent',
        headers: {},
        query: {},
      } as any;

      await expect(controller.findOne('non-existent', mockReq)).rejects.toThrow(HttpException);
    });
  });

  describe('Error handling', () => {
    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      } as AxiosError;

      mockHttpService.request.mockReturnValue(throwError(() => timeoutError));

      const mockReq = {
        url: '/api/v1/buildings',
        headers: {},
        query: {},
      } as any;

      await expect(controller.findAll(mockReq)).rejects.toThrow(HttpException);
    });

    it('should handle network errors', async () => {
      const networkError = {
        message: 'Network Error',
      } as AxiosError;

      mockHttpService.request.mockReturnValue(throwError(() => networkError));

      const mockReq = {
        url: '/api/v1/buildings',
        headers: {},
        query: {},
      } as any;

      await expect(controller.findAll(mockReq)).rejects.toThrow(HttpException);
    });
  });
});

