import { DataSource, Raw } from 'typeorm';
import { Developer } from '../../src/entities/developer.entity';
import { Region } from '../../src/entities/region.entity';
import { Building } from '../../src/entities/building.entity';
import { BuildingStatus } from '@new-building-portal/contracts';

export async function createTestDeveloper(dataSource: DataSource): Promise<Developer> {
  const developerRepo = dataSource.getRepository(Developer);
  const developer = developerRepo.create({
    name: { en: 'Test Developer', am: 'Փորձարկման Դեվելոպեր', ru: 'Тестовый Застройщик' },
    description: { en: 'Test developer description' },
    email: 'test@developer.com',
    phone: '+37412345678',
  });
  return await developerRepo.save(developer);
}

export async function createTestRegion(dataSource: DataSource): Promise<Region> {
  const regionRepo = dataSource.getRepository(Region);
  const region = regionRepo.create({
    name: { en: 'Test Region', am: 'Փորձարկման Տարածք', ru: 'Тестовый Регион' },
    region_type: 'district',
  });
  return await regionRepo.save(region);
}

export async function createTestBuilding(
  dataSource: DataSource,
  developerId: string,
  regionId: string,
  overrides?: Partial<Building>,
): Promise<Building> {
  const buildingRepo = dataSource.getRepository(Building);
  
  // Use create() to get default values and handle structure
  const tempBuilding = buildingRepo.create({
    title: { en: 'Test Building', am: 'Փորձարկման Շենք', ru: 'Тестовое Здание' },
    description: { en: 'Test building description' },
    address: { en: 'Test Address 123', am: 'Փորձարկման Հասցե 123', ru: 'Тестовый Адрес 123' },
    // location is handled manually
    city: 'Yerevan',
    floors: 10,
    total_units: 100,
    area_min: 50,
    area_max: 150,
    price_per_m2_min: 500000,
    price_per_m2_max: 800000,
    currency: 'AMD',
    developer_id: developerId,
    region_id: regionId,
    status: BuildingStatus.PUBLISHED,
    ...overrides,
  });

  // Extract values
  const values = [
    tempBuilding.title,
    tempBuilding.description,
    tempBuilding.address,
    tempBuilding.city,
    tempBuilding.floors,
    tempBuilding.total_units,
    tempBuilding.area_min,
    tempBuilding.area_max,
    tempBuilding.price_per_m2_min,
    tempBuilding.price_per_m2_max,
    tempBuilding.currency,
    tempBuilding.developer_id,
    tempBuilding.region_id,
    tempBuilding.status,
    tempBuilding.is_featured || false
  ];

  const result = await dataSource.query(`
    INSERT INTO listings.buildings (
      title, description, address, location, city, floors, total_units, 
      area_min, area_max, price_per_m2_min, price_per_m2_max, currency, 
      developer_id, region_id, status, is_featured, created_at, updated_at
    ) VALUES (
      $1, $2, $3, ST_SetSRID(ST_MakePoint(44.5091, 40.1811), 4326), $4, $5, $6, 
      $7, $8, $9, $10, $11, 
      $12, $13, $14, $15, DEFAULT, DEFAULT
    ) RETURNING id
  `, values);

  const id = result[0].id;
  return await buildingRepo.findOneByOrFail({ id });
}

