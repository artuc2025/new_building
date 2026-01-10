import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingsController } from './buildings.controller';
import { BuildingsAdminController } from './buildings-admin.controller';
import { BuildingsService } from './buildings.service';
import { Building } from '../entities/building.entity';
import { PricingSnapshot } from '../entities/pricing-snapshot.entity';
import { Developer } from '../entities/developer.entity';
import { BuildingStatus } from '@new-building-portal/contracts';
import { Region } from '../entities/region.entity';
import { CreateBuildingDto } from './dto';
import { NotFoundException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';

describe('BuildingsController Specs', () => {
  let controller: BuildingsController;
  let adminController: BuildingsAdminController;
  let service: BuildingsService;
  let repository: Repository<Building>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
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
    status: BuildingStatus.PUBLISHED,
    created_at: new Date(),
    updated_at: new Date(),
    developer: mockDeveloper,
    region: mockRegion,
  } as Building;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingsController, BuildingsAdminController],
      providers: [
        BuildingsService,
        {
          provide: getRepositoryToken(Building),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PricingSnapshot),
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
    adminController = module.get<BuildingsAdminController>(BuildingsAdminController);
    service = module.get<BuildingsService>(BuildingsService);
    repository = module.get<Repository<Building>>(getRepositoryToken(Building));
  });

  describe('Public Endpoints (BuildingsController)', () => {
    describe('GET /v1/buildings', () => {
      it('should return paginated list of buildings', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(1),
          getMany: jest.fn().mockResolvedValue([mockBuilding]),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await controller.findAll({ page: 1, limit: 10 });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('pagination');
        expect(result.pagination.total).toBe(1);
      });
    });

    describe('GET /v1/buildings/:id', () => {
      it('should return building details', async () => {
        mockRepository.findOne.mockResolvedValue(mockBuilding);

        const result = await controller.findOne('building-1');

        expect(result).toHaveProperty('data');
        expect(result.data.id).toBe('building-1');
      });

      it('should return 404 when building not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Admin Endpoints (BuildingsAdminController)', () => {
    describe('POST /v1/admin/buildings', () => {
      it('should create a building', async () => {
        const createDto: CreateBuildingDto = {
          title: { en: 'New Building' },
          address: { en: 'New Address' },
          location: { lng: 44.5091, lat: 40.1811 },
          floors: 5,
          areaMin: 60,
          areaMax: 120,
          developerId: 'dev-1',
          regionId: 'region-1',
        };

        mockRepository.query.mockResolvedValue([{ id: 'building-1' }]);
        mockRepository.findOne.mockResolvedValue({
          ...mockBuilding,
          title: { en: 'New Building' },
        });

        const result = await adminController.create(createDto);

        expect(result).toHaveProperty('data');
        expect(result.data.title.en).toBe('New Building');
      });
    });

    describe('PUT /v1/admin/buildings/:id', () => {
      it('should update a building', async () => {
        const updateDto = {
          title: { en: 'Updated Building' },
        };

        mockRepository.findOne.mockResolvedValue(mockBuilding);
        mockRepository.query.mockResolvedValue(undefined);
        mockRepository.findOne.mockResolvedValueOnce(mockBuilding).mockResolvedValueOnce({
          ...mockBuilding,
          title: { en: 'Updated Building' },
        });

        const result = await adminController.update('building-1', updateDto);

        expect(result).toHaveProperty('data');
        expect(result.data.title.en).toBe('Updated Building');
      });
    });

    describe('POST /v1/admin/buildings/:id/publish', () => {
      it('should publish a building', async () => {
        mockRepository.findOne.mockResolvedValue(mockBuilding);
        mockRepository.update.mockResolvedValue(undefined);
        mockRepository.findOne.mockResolvedValueOnce(mockBuilding).mockResolvedValueOnce({
          ...mockBuilding,
          status: BuildingStatus.PUBLISHED,
        });

        const result = await adminController.publish('building-1', true);

        expect(result.data.status).toBe(BuildingStatus.PUBLISHED);
        expect(mockRepository.update).toHaveBeenCalledWith('building-1', expect.objectContaining({
          status: BuildingStatus.PUBLISHED,
        }));
      });
    });

    describe('DELETE /v1/admin/buildings/:id', () => {
      it('should soft-delete a building', async () => {
        mockRepository.findOne.mockResolvedValue(mockBuilding);
        mockRepository.update.mockResolvedValue(undefined);

        await adminController.remove('building-1');

        expect(mockRepository.update).toHaveBeenCalledWith('building-1', expect.objectContaining({
          status: BuildingStatus.ARCHIVED,
        }));
      });
    });
  });
});