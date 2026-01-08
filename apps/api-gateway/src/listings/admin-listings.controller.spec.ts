import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AdminListingsController } from './listings.controller';
import { AdminGuard } from '../common/guards/admin.guard';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AdminListingsController (Admin Endpoints)', () => {
  let controller: AdminListingsController;
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

  const mockAdminGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminListingsController],
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
    })
      .overrideGuard(AdminGuard)
      .useValue(mockAdminGuard)
      .compile();

    controller = module.get<AdminListingsController>(AdminListingsController);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/buildings', () => {
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
        url: '/api/v1/admin/buildings',
        headers: { 'x-admin-key': 'test-key' },
        query: { page: 1, limit: 10 },
      } as any;

      const result = await controller.findAll(mockReq);

      expect(mockHttpService.request).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('GET /api/v1/admin/buildings/:id', () => {
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
        url: '/api/v1/admin/buildings/building-1',
        headers: { 'x-admin-key': 'test-key' },
        query: {},
      } as any;

      const result = await controller.findOne('building-1', mockReq);

      expect(mockHttpService.request).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('POST /api/v1/admin/buildings', () => {
    it('should proxy request to listings-service (happy path)', async () => {
      const mockResponse = {
        status: 201,
        data: {
          data: {
            id: 'building-1',
            title: { en: 'New Building' },
          },
        },
      };

      mockHttpService.request.mockReturnValue(of(mockResponse));

      const mockReq = {
        url: '/api/v1/admin/buildings',
        headers: { 'x-admin-key': 'test-key' },
        body: {
          title: { en: 'New Building' },
          address: { en: 'Address' },
          location: { lat: 40.1811, lng: 44.5091 },
          floors: 5,
          totalUnits: 120,
          developerId: 'dev-1',
          regionId: 'region-1',
        },
      } as any;

      const result = await controller.create(mockReq);

      expect(mockHttpService.request).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('PUT /api/v1/admin/buildings/:id', () => {
    it('should proxy request to listings-service (happy path)', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: 'building-1',
            title: { en: 'Updated Building' },
          },
        },
      };

      mockHttpService.request.mockReturnValue(of(mockResponse));

      const mockReq = {
        url: '/api/v1/admin/buildings/building-1',
        headers: { 'x-admin-key': 'test-key' },
        body: {
          title: { en: 'Updated Building' },
        },
      } as any;

      const result = await controller.update('building-1', mockReq);

      expect(mockHttpService.request).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('DELETE /api/v1/admin/buildings/:id', () => {
    it('should proxy request to listings-service (happy path)', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: 'building-1',
            status: 'archived',
            deletedAt: '2024-01-15T10:00:00Z',
          },
        },
      };

      mockHttpService.request.mockReturnValue(of(mockResponse));

      const mockReq = {
        url: '/api/v1/admin/buildings/building-1',
        headers: { 'x-admin-key': 'test-key' },
      } as any;

      const result = await controller.remove('building-1', mockReq);

      expect(mockHttpService.request).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });
  });
});

