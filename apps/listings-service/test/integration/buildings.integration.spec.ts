import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { startTestDatabase, stopTestDatabase } from '../utils/test-db';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Building } from '../../src/entities/building.entity';
import { Developer } from '../../src/entities/developer.entity';
import { Region } from '../../src/entities/region.entity';

describe('Buildings Integration Tests', () => {
  let app: INestApplication;
  let buildingRepository: Repository<Building>;
  let developerRepository: Repository<Developer>;
  let regionRepository: Repository<Region>;
  let testDeveloper: Developer;
  let testRegion: Region;

  beforeAll(async () => {
    // Set admin key for tests
    process.env.ADMIN_API_KEY = 'test-admin-key';

    // Start test database
    await startTestDatabase();

    // Create NestJS app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    buildingRepository = moduleFixture.get<Repository<Building>>(
      getRepositoryToken(Building),
    );
    developerRepository = moduleFixture.get<Repository<Developer>>(
      getRepositoryToken(Developer),
    );
    regionRepository = moduleFixture.get<Repository<Region>>(
      getRepositoryToken(Region),
    );

    // Create test data
    testDeveloper = developerRepository.create({
      id: '00000000-0000-0000-0000-000000000001',
      name: { en: 'Test Developer' },
      description: { en: 'Test Description' },
    });
    await developerRepository.save(testDeveloper);

    testRegion = regionRepository.create({
      id: '00000000-0000-0000-0000-000000000001',
      name: { en: 'Test Region' },
      region_type: 'district',
    });
    await regionRepository.save(testRegion);

    await app.init();
  });

  afterAll(async () => {
    // Cleanup
    if (buildingRepository) {
      await buildingRepository.delete({});
    }
    if (developerRepository) {
      await developerRepository.delete({});
    }
    if (regionRepository) {
      await regionRepository.delete({});
    }
    
    await app.close();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    // Clean up buildings before each test
    await buildingRepository.delete({});
  });

  describe('CRUD Operations', () => {
    it('should create a building (POST /v1/admin/buildings)', async () => {
      const createDto = {
        title: { en: 'New Building', am: 'Նոր Շենք' },
        address: { en: '123 Main St', am: '123 Գլխավոր Փողոց' },
        location: { lat: 40.1811, lng: 44.5091 },
        floors: 10,
        areaMin: 60,
        areaMax: 120,
        developerId: testDeveloper.id,
        regionId: testRegion.id,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toEqual(createDto.title);
      expect(response.body.data.location).toEqual(createDto.location);
      expect(response.body.data.floors).toBe(createDto.floors);
    });

    it('should list buildings (GET /v1/buildings)', async () => {
      // Create a building first
      const building = buildingRepository.create({
        title: { en: 'Listed Building' },
        address: { en: 'Address' },
        location: 'POINT(44.5091 40.1811)',
        floors: 5,
        area_min: 50,
        area_max: 100,
        currency: 'AMD',
        developer_id: testDeveloper.id,
        region_id: testRegion.id,
        status: 'published',
      });
      await buildingRepository.save(building);

      const response = await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should get building by ID (GET /v1/buildings/:id)', async () => {
      // Create a building first
      const building = buildingRepository.create({
        title: { en: 'Detail Building' },
        address: { en: 'Address' },
        location: 'POINT(44.5091 40.1811)',
        floors: 8,
        area_min: 55,
        area_max: 110,
        currency: 'AMD',
        developer_id: testDeveloper.id,
        region_id: testRegion.id,
        status: 'published',
      });
      const saved = await buildingRepository.save(building);

      const response = await request(app.getHttpServer())
        .get(`/v1/buildings/${saved.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(saved.id);
      expect(response.body.data.title).toEqual(saved.title);
      expect(response.body.data.location).toEqual({ lat: 40.1811, lng: 44.5091 });
    });

    it('should update a building (PUT /v1/admin/buildings/:id)', async () => {
      // Create a building first
      const building = buildingRepository.create({
        title: { en: 'Original Title' },
        address: { en: 'Original Address' },
        location: 'POINT(44.5091 40.1811)',
        floors: 5,
        area_min: 50,
        area_max: 100,
        currency: 'AMD',
        developer_id: testDeveloper.id,
        region_id: testRegion.id,
        status: 'draft',
      });
      const saved = await buildingRepository.save(building);

      const updateDto = {
        title: { en: 'Updated Title' },
        floors: 12,
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/admin/buildings/${saved.id}`)
        .set('x-admin-key', 'test-admin-key')
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.title).toEqual(updateDto.title);
      expect(response.body.data.floors).toBe(updateDto.floors);
    });

    it('should soft-delete a building (DELETE /v1/admin/buildings/:id)', async () => {
      // Create a building first
      const building = buildingRepository.create({
        title: { en: 'To Delete' },
        address: { en: 'Address' },
        location: 'POINT(44.5091 40.1811)',
        floors: 5,
        area_min: 50,
        area_max: 100,
        currency: 'AMD',
        developer_id: testDeveloper.id,
        region_id: testRegion.id,
        status: 'published',
      });
      const saved = await buildingRepository.save(building);

      const response = await request(app.getHttpServer())
        .delete(`/v1/admin/buildings/${saved.id}`)
        .set('x-admin-key', 'test-admin-key')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe('archived');
      expect(response.body.data).toHaveProperty('deletedAt');

      // Verify building is not visible in public list
      const listResponse = await request(app.getHttpServer())
        .get('/v1/buildings')
        .query({ page: 1, limit: 20 })
        .expect(200);

      const found = listResponse.body.data.find((b: any) => b.id === saved.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 with error envelope for invalid data', async () => {
      const invalidDto = {
        title: { en: 'Invalid' },
        // Missing required fields
        floors: -1, // Invalid value
      };

      const response = await request(app.getHttpServer())
        .post('/v1/admin/buildings')
        .set('x-admin-key', 'test-admin-key')
        .send(invalidDto)
        .expect(400);

      // Validate standard error envelope
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode', 400);
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 with error envelope for non-existent building', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/buildings/00000000-0000-0000-0000-000000000999')
        .expect(404);

      // Validate standard error envelope
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });
});

