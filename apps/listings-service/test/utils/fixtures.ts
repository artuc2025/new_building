import { DataSource } from 'typeorm';
import { Developer } from '../../src/entities/developer.entity';
import { Region } from '../../src/entities/region.entity';
import { Building } from '../../src/entities/building.entity';

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
  const building = buildingRepo.create({
    title: { en: 'Test Building', am: 'Փորձարկման Շենք', ru: 'Тестовое Здание' },
    description: { en: 'Test building description' },
    address: { en: 'Test Address 123', am: 'Փորձարկման Հասցե 123', ru: 'Тестовый Адрес 123' },
    location: 'POINT(44.5091 40.1811)', // Yerevan coordinates
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
    status: 'published',
    ...overrides,
  });
  return await buildingRepo.save(building);
}

