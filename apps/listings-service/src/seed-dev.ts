
import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { Building } from './entities/building.entity';
import { Developer } from './entities/developer.entity';
import { Region } from './entities/region.entity';

async function seed() {
    try {
        console.log('Initializing DataSource...');
        await AppDataSource.initialize();

        // Check if data exists
        const buildingRepo = AppDataSource.getRepository(Building);
        const count = await buildingRepo.count();
        if (count > 0) {
            console.log(`Database already has ${count} buildings.`);
            await AppDataSource.destroy();
            return;
        }

        console.log('Seeding data...');

        const developerRepo = AppDataSource.getRepository(Developer);
        const regionRepo = AppDataSource.getRepository(Region);

        // Create Developers
        const dev1 = developerRepo.create({
            name: { am: 'Elite Group', en: 'Elite Group', ru: 'Elite Group' },
            website_url: 'https://elitegroup.am',
        });
        const dev2 = developerRepo.create({
            name: { am: 'Renshine', en: 'Renshin', ru: 'Renshin' },
            website_url: 'https://renshin.am',
        });
        await developerRepo.save([dev1, dev2]);

        // Create Regions
        const reg1 = regionRepo.create({
            name: { am: 'Kentron', en: 'Kentron', ru: 'Kentron' },
            region_type: 'district',
        });
        const reg2 = regionRepo.create({
            name: { am: 'Arabkir', en: 'Arabkir', ru: 'Arabkir' },
            region_type: 'district',
        });
        await regionRepo.save([reg1, reg2]);

        // Create Buildings
        const buildings: any[] = [];

        // Building 1
        const b1 = buildingRepo.create({
            title: { en: 'Elite Plaza', am: 'Elite Plaza', ru: 'Elite Plaza' },
            description: { en: 'Luxury business center and apartments', am: '...', ru: '...' },
            address: { en: 'Khorenatsi 15', am: 'Khorenatsi 15', ru: 'Khorenatsi 15' },
            city: 'Yerevan',
            location: 'POINT(44.51 40.18)',
            floors: 18,
            price_per_m2_min: 2000,
            price_per_m2_max: 3500,
            area_min: 50,
            area_max: 200,
            currency: 'USD',
            status: 'published' as any,
            developer: dev1,
            region: reg1,
            commissioning_date: new Date('2024-12-01'),
            construction_status: 'under_construction'
        });
        buildings.push(b1);

        // Building 2
        const b2 = buildingRepo.create({
            title: { en: 'Sky View', am: 'Sky View', ru: 'Sky View' },
            address: { en: 'Komitas 5', am: 'Komitas 5', ru: 'Komitas 5' },
            city: 'Yerevan',
            location: 'POINT(44.52 40.20)',
            floors: 12,
            price_per_m2_min: 1500,
            price_per_m2_max: 2200,
            area_min: 40,
            area_max: 120,
            currency: 'USD',
            status: 'published' as any,
            developer: dev2,
            region: reg2,
            commissioning_date: new Date('2025-06-01'),
            construction_status: 'planned'
        });
        buildings.push(b2);

        await buildingRepo.save(buildings);

        console.log('Seeding complete!');
        await AppDataSource.destroy();

    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seed();
