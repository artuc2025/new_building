import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { Building } from '../entities/building.entity';
import { Developer } from '../entities/developer.entity';
import { Region } from '../entities/region.entity';
import { CreateBuildingDto } from './dto';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';

describe('BuildingsController (Contract Tests)', () => {
  let controller: BuildingsController;
  let service: BuildingsService;
  let repository: Repository<Building>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };

  const mockDeveloper: Developer = {
    id: 'dev-1',
    name: { en: 'Test Developer' },
    created_at: new Date(),
    updated_at: new Date(),
  } as Developer;

  const mockRegion: Region = {
    id: 'region-1',
    name: { en: 'Test Region' },
    region_type: 'city',
    created_at: new Date(),
  } as Region;

  const mockBuilding: Building = {
    id: 'building-1',
    title: { en: 'Test Building' },
    description: { en: 'Test Description' },
    address: { en: 'Test Address' },
    location: 'POINT(44.5091 40.1811)',
    city: 'Yerevan',
    floors: 10,
    area_min: 50,
    area_max: 150,
    currency: 'AMD',
    developer_id: 'dev-1',
    region_id: 'region-1',
    status: 'published',
    created_at: new Date(),
    updated_at: new Date(),
    developer: mockDeveloper,
    region: mockRegion,
  } as Building;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingsController],
      providers: [
        BuildingsService,
        {
          provide: getRepositoryToken(Building),
          useValue: mockRepository,
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<BuildingsController>(BuildingsController);
    service = module.get<BuildingsService>(BuildingsService);
    repository = module.get<Repository<Building>>(getRepositoryToken(Building));
  });

  describe('GET /v1/buildings', () => {
    it('should return paginated list of buildings (happy path)', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().resolves(1),
        getMany: jest.fn().resolves([mockBuilding]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await controller.findAll({ page: 1, limit: 10 });

      // Validate response structure matches OpenAPI schema
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('total_pages');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(1);
    });

    it('should return 400 for invalid query parameters', async () => {
      const invalidQuery = { page: -1, limit: 200 };

      // This should be caught by ValidationPipe, but we test the service behavior
      await expect(controller.findAll(invalidQuery as any)).rejects.toThrow();
    });
  });

  describe('GET /v1/buildings/:id', () => {
    it('should return building details (happy path)', async () => {
      mockRepository.findOne.mockResolvedValue(mockBuilding);

      const result = await controller.findOne('building-1');

      // Validate response structure matches OpenAPI schema
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('floors');
      expect(result).toHaveProperty('area_min');
      expect(result).toHaveProperty('area_max');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('developer_id');
      expect(result).toHaveProperty('region_id');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('updated_at');
      expect(result.id).toBe('building-1');
    });

    it('should return 404 when building not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /v1/buildings', () => {
    it('should create a building (happy path)', async () => {
      const createDto: CreateBuildingDto = {
        title: { en: 'New Building' },
        address: { en: 'New Address' },
        location: { longitude: 44.5091, latitude: 40.1811 },
        floors: 5,
        area_min: 60,
        area_max: 120,
        developer_id: 'dev-1',
        region_id: 'region-1',
      };

      mockRepository.create.mockReturnValue(mockBuilding);
      mockRepository.save.mockResolvedValue(mockBuilding);
      mockRepository.findOne.mockResolvedValue(mockBuilding);

      const result = await controller.create(createDto);

      // Validate response structure matches OpenAPI schema
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result.title.en).toBe('New Building');
    });

    it('should return 400 for invalid input data', async () => {
      const invalidDto = {
        title: null, // Invalid
        floors: -1, // Invalid
      } as any;

      await expect(controller.create(invalidDto)).rejects.toThrow();
    });
  });

  describe('PUT /v1/buildings/:id', () => {
    it('should update a building (happy path)', async () => {
      const updateDto = {
        title: { en: 'Updated Building' },
      };

      mockRepository.findOne.mockResolvedValue(mockBuilding);
      mockRepository.update.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValueOnce(mockBuilding).mockResolvedValueOnce({
        ...mockBuilding,
        title: { en: 'Updated Building' },
      });

      const result = await controller.update('building-1', updateDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
    });

    it('should return 404 when building not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.update('non-existent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /v1/buildings/:id', () => {
    it('should soft-delete a building (happy path)', async () => {
      mockRepository.findOne.mockResolvedValue(mockBuilding);
      mockRepository.update.mockResolvedValue(undefined);

      await controller.remove('building-1');

      expect(mockRepository.update).toHaveBeenCalledWith('building-1', {
        deleted_at: expect.any(Date),
      });
    });

    it('should return 404 when building not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});

