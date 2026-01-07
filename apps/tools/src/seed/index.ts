import { createPool, getDbUrl } from '../db/data-source';

// Create pools for each service
const listingsPool = createPool('listings');
const contentPool = createPool('content');
const mediaPool = createPool('media');
const analyticsPool = createPool('analytics');

// Helper to generate JSONB for multi-language fields
const ml = (am: string, ru: string, en: string) => ({ am, ru, en });

// Helper to create PostGIS POINT from lat/lng
const point = (lng: number, lat: number) => `POINT(${lng} ${lat})`;

// Helper to create PostGIS POLYGON (simple bounding box for regions)
const polygon = (minLng: number, minLat: number, maxLng: number, maxLat: number) =>
  `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;

/**
 * Detect DB configuration mode and print safely (no credentials/URLs)
 */
function printDbMode() {
  const serviceEnvVars = {
    listings: 'DATABASE_URL_LISTINGS',
    content: 'DATABASE_URL_CONTENT',
    media: 'DATABASE_URL_MEDIA',
    analytics: 'DATABASE_URL_ANALYTICS',
  };

  // Check if any per-service URL is set
  const hasPerServiceUrls = Object.values(serviceEnvVars).some(
    (envVar) => !!process.env[envVar]
  );

  if (hasPerServiceUrls) {
    console.log('[seed] DB mode: per-service URLs');
    for (const [service, envVar] of Object.entries(serviceEnvVars)) {
      const isSet = !!process.env[envVar];
      const fallbackSet = !!process.env.DATABASE_URL;
      console.log(
        `[seed] ${service}: ${envVar} ${isSet ? '(set)' : '(not set)'} | fallback: DATABASE_URL ${fallbackSet ? '(set)' : '(not set)'}`
      );
    }
  } else {
    console.log('[seed] DB mode: shared DATABASE_URL');
    const isSet = !!process.env.DATABASE_URL;
    console.log(`[seed] all services use DATABASE_URL ${isSet ? '(set)' : '(not set)'}`);
  }
  console.log('');
}

async function seed() {
  console.log('🌱 Starting database seed...');
  printDbMode();

  // Seed each service in its own transaction
  // Note: We seed media first because listings references media IDs
  const mediaAssetIds = await seedMedia();
  const buildingIds = await seedListings(mediaAssetIds);
  await seedContent();
  await seedAnalytics(buildingIds);

  console.log('\n✅ All seed operations completed successfully!');
  
  // Cleanup pools
  await listingsPool.end();
  await contentPool.end();
  await mediaPool.end();
  await analyticsPool.end();
}

async function seedMedia(): Promise<string[]> {
  const client = await mediaPool.connect();

  try {
    // Ensure schema exists before starting transaction
    await client.query('CREATE SCHEMA IF NOT EXISTS media;').catch(() => {});
    
    await client.query('BEGIN');
    console.log('📦 Seeding media service...');

    // Clear existing data
    await client.query('DELETE FROM media.processing_jobs').catch(() => {});
    await client.query('DELETE FROM media.assets').catch(() => {});

    // Seed Media Assets (minimal stubs)
    console.log('Seeding media assets...');
    const mediaAssets: string[] = [];
    for (let i = 0; i < 15; i++) {
      const result = await client.query(
        `INSERT INTO media.assets (id, original_filename, mime_type, file_size, bucket, object_key, processing_status)
         VALUES (gen_random_uuid(), $1, 'image/jpeg', 102400, 'buildings', $2, 'completed')
         RETURNING id`,
        [`building-${i + 1}.jpg`, `buildings/building-${i + 1}.jpg`]
      );
      mediaAssets.push(result.rows[0].id);
    }
    console.log(`✓ Created ${mediaAssets.length} media assets`);

    await client.query('COMMIT');
    return mediaAssets;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors (transaction may already be aborted)
    }
    console.error('❌ Media seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedListings(mediaAssetIds: string[]): Promise<string[]> {
  const client = await listingsPool.connect();

  try {
    // Ensure schema exists before starting transaction
    await client.query('CREATE SCHEMA IF NOT EXISTS listings;').catch(() => {});
    
    await client.query('BEGIN');
    console.log('📦 Seeding listings service...');

    // Clear existing data (idempotent seed - wipe and reseed)
    await client.query('DELETE FROM listings.building_images').catch(() => {});
    await client.query('DELETE FROM listings.pricing_snapshots').catch(() => {});
    await client.query('DELETE FROM listings.building_submissions').catch(() => {});
    await client.query('DELETE FROM listings.buildings').catch(() => {});
    await client.query('DELETE FROM listings.regions').catch(() => {});
    await client.query('DELETE FROM listings.developers').catch(() => {});

    // 1. Seed Developers (3-5 developers)
    console.log('Seeding developers...');
    const developerIds: string[] = [];
    const developers = [
      {
        name: ml('Նոր Քաղաք', 'Новый Город', 'New City'),
        description: ml('Նոր Քաղաքը մեծ նախագիծ է', 'Новый Город - большой проект', 'New City is a large project'),
        email: 'info@newcity.am',
        phone: '+374 10 123456',
        website_url: 'https://newcity.am',
        established_year: 2015,
      },
      {
        name: ml('Լուքս Դեվելոպմենթ', 'Люкс Девелопмент', 'Lux Development'),
        description: ml('Լուքս բնակարաններ', 'Люкс апартаменты', 'Luxury apartments'),
        email: 'contact@luxdev.am',
        phone: '+374 10 234567',
        website_url: 'https://luxdev.am',
        established_year: 2010,
      },
      {
        name: ml('Արմենիա Բիլդ', 'Армения Билд', 'Armenia Build'),
        description: ml('Մասնագիտացված շինարարություն', 'Специализированное строительство', 'Specialized construction'),
        email: 'info@armeniabuild.am',
        phone: '+374 10 345678',
        established_year: 2008,
      },
      {
        name: ml('Երևան Հաուզ', 'Ереван Хаус', 'Yerevan House'),
        description: ml('Երևանում բնակարաններ', 'Квартиры в Ереване', 'Apartments in Yerevan'),
        email: 'sales@yerevanhouse.am',
        phone: '+374 10 456789',
        established_year: 2012,
      },
    ];

    for (const dev of developers) {
      const result = await client.query(
        `INSERT INTO listings.developers (id, name, description, email, phone, website_url, established_year)
         VALUES (gen_random_uuid(), $1::jsonb, $2::jsonb, $3, $4, $5, $6)
         RETURNING id`,
        [JSON.stringify(dev.name), JSON.stringify(dev.description), dev.email, dev.phone, dev.website_url, dev.established_year]
      );
      developerIds.push(result.rows[0].id);
    }
    console.log(`✓ Created ${developers.length} developers`);

    // 2. Seed Regions (hierarchy: Yerevan -> Districts -> Neighborhoods)
    console.log('Seeding regions...');
    const yerevanResult = await client.query(
      `INSERT INTO listings.regions (id, name, region_type)
       VALUES (gen_random_uuid(), $1::jsonb, 'city')
       RETURNING id`,
      [JSON.stringify(ml('Երևան', 'Ереван', 'Yerevan'))]
    );
    const yerevanId = yerevanResult.rows[0].id;

    const districts = [
      { name: ml('Արաբկիր', 'Арабкир', 'Arabkir'), type: 'district' as const },
      { name: ml('Կենտրոն', 'Центр', 'Center'), type: 'district' as const },
      { name: ml('Աջափնյակ', 'Ачапняк', 'Ajapnyak'), type: 'district' as const },
    ];

    const districtIds: string[] = [];
    // Insert districts (with parent = Yerevan)
    for (const district of districts) {
      const result = await client.query(
        `INSERT INTO listings.regions (id, name, parent_region_id, region_type, boundary)
         VALUES (gen_random_uuid(), $1::jsonb, $2, $3, ST_GeogFromText($4))
         RETURNING id`,
        [
          JSON.stringify(district.name),
          yerevanId,
          district.type,
          polygon(44.4, 40.1, 44.6, 40.2), // Example bounding box
        ]
      );
      districtIds.push(result.rows[0].id);
    }

    // Insert a neighborhood (child of first district)
    await client.query(
      `INSERT INTO listings.regions (id, name, parent_region_id, region_type, boundary)
       VALUES (gen_random_uuid(), $1::jsonb, $2, 'neighborhood', ST_GeogFromText($3))`,
      [
        JSON.stringify(ml('Նոր Արաբկիր', 'Новый Арабкир', 'New Arabkir')),
        districtIds[0],
        polygon(44.45, 40.15, 44.5, 40.18), // Smaller bounding box
      ]
    );

    console.log(`✓ Created 1 city, ${districts.length} districts, 1 neighborhood`);

    // 3. Seed Buildings (10-20 buildings)
    console.log('Seeding buildings...');
    const buildings: string[] = [];
    const buildingLocations = [
      { lng: 44.5091, lat: 40.1811 }, // Yerevan center
      { lng: 44.5150, lat: 40.1850 },
      { lng: 44.5000, lat: 40.1750 },
      { lng: 44.5200, lat: 40.1900 },
      { lng: 44.4950, lat: 40.1700 },
      { lng: 44.5100, lat: 40.1800 },
      { lng: 44.5050, lat: 40.1820 },
      { lng: 44.5120, lat: 40.1840 },
      { lng: 44.5080, lat: 40.1790 },
      { lng: 44.5140, lat: 40.1860 },
      { lng: 44.5020, lat: 40.1770 },
      { lng: 44.5160, lat: 40.1880 },
      { lng: 44.5070, lat: 40.1780 },
      { lng: 44.5130, lat: 40.1830 },
      { lng: 44.5010, lat: 40.1760 },
    ];

    for (let i = 0; i < 15; i++) {
      const loc = buildingLocations[i];
      const developerId = developerIds[i % developerIds.length];
      const regionId = districtIds[i % districtIds.length];
      const status = i < 10 ? 'published' : 'draft';
      const priceMin = 200000 + Math.random() * 100000;
      const priceMax = priceMin + 50000 + Math.random() * 50000;
      const areaMin = 40 + Math.random() * 20;
      const areaMax = areaMin + 20 + Math.random() * 30;

      const buildingResult = await client.query(
        `INSERT INTO listings.buildings (
          id, title, description, address, location, city, floors, total_units,
          commissioning_date, construction_status, price_per_m2_min, price_per_m2_max,
          area_min, area_max, currency, developer_id, region_id, status, is_featured,
          developer_website_url, created_at, updated_at, published_at
        ) VALUES (
          gen_random_uuid(), $1::jsonb, $2::jsonb, $3::jsonb, ST_GeogFromText($4), $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW(), $20
        ) RETURNING id`,
        [
          JSON.stringify(ml(`Նոր Բնակարանային Համալիր ${i + 1}`, `Новый Жилой Комплекс ${i + 1}`, `New Residential Complex ${i + 1}`)),
          JSON.stringify(ml(`Նկարագրություն ${i + 1}`, `Описание ${i + 1}`, `Description ${i + 1}`)),
          JSON.stringify(ml(`Հասցե ${i + 1}`, `Адрес ${i + 1}`, `Address ${i + 1}`)),
          point(loc.lng, loc.lat),
          'Yerevan',
          5 + Math.floor(Math.random() * 15), // 5-20 floors
          50 + Math.floor(Math.random() * 100), // 50-150 units
          new Date(2025 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), 1),
          ['planned', 'under_construction', 'completed'][Math.floor(Math.random() * 3)],
          priceMin,
          priceMax,
          areaMin,
          areaMax,
          'AMD',
          developerId,
          regionId,
          status,
          i < 3, // First 3 are featured
          developers[i % developers.length].website_url,
          status === 'published' ? new Date() : null,
        ]
      );
      const buildingId = buildingResult.rows[0].id;
      buildings.push(buildingId);

      // Add pricing snapshots (2-3 per building)
      const snapshotCount = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < snapshotCount; j++) {
        const snapshotDate = new Date();
        snapshotDate.setMonth(snapshotDate.getMonth() - (snapshotCount - j));
        await client.query(
          `INSERT INTO listings.pricing_snapshots (building_id, price_per_m2_min, price_per_m2_max, currency, area_min, area_max, snapshot_date)
           VALUES ($1, $2, $3, 'AMD', $4, $5, $6)
           ON CONFLICT (building_id, snapshot_date) DO NOTHING`,
          [buildingId, priceMin - j * 5000, priceMax - j * 5000, areaMin, areaMax, snapshotDate]
        );
      }

      // Connect media assets to buildings (2-3 images per building)
      const imageCount = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < imageCount && i * imageCount + j < mediaAssetIds.length; j++) {
        await client.query(
          `INSERT INTO listings.building_images (building_id, media_id, display_order, is_primary)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [buildingId, mediaAssetIds[i * imageCount + j] || mediaAssetIds[j], j, j === 0]
        );
      }
    }
    console.log(`✓ Created ${buildings.length} buildings with pricing snapshots and images`);

    await client.query('COMMIT');
    return buildings;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors (transaction may already be aborted)
    }
    console.error('❌ Listings seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedContent(): Promise<void> {
  const client = await contentPool.connect();

  try {
    // Ensure schema exists before starting transaction
    await client.query('CREATE SCHEMA IF NOT EXISTS content;').catch(() => {});
    
    await client.query('BEGIN');
    console.log('📦 Seeding content service...');

    // Clear existing data
    await client.query('DELETE FROM content.seo_metadata').catch(() => {});
    await client.query('DELETE FROM content.articles').catch(() => {});

    // Seed Articles (5-10 blog articles)
    console.log('Seeding articles...');
    const articles: string[] = [];
    for (let i = 0; i < 8; i++) {
      const status = i < 5 ? 'published' : 'draft';
      const slug = `article-${i + 1}-${status}`;

      const result = await client.query(
        `INSERT INTO content.articles (id, slug, title, excerpt, body, status, published_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, NOW(), NOW())
         RETURNING id`,
        [
          slug,
          JSON.stringify(ml(`Հոդված ${i + 1}`, `Статья ${i + 1}`, `Article ${i + 1}`)),
          JSON.stringify(ml(`Կարճ նկարագրություն`, `Краткое описание`, `Short description`)),
          JSON.stringify(ml(`Հոդվածի բովանդակություն...`, `Содержание статьи...`, `Article content...`)),
          status,
          status === 'published' ? new Date() : null,
        ]
      );
      articles.push(result.rows[0].id);
    }
    console.log(`✓ Created ${articles.length} articles`);

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors (transaction may already be aborted)
    }
    console.error('❌ Content seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedAnalytics(buildingIds: string[]): Promise<void> {
  const client = await analyticsPool.connect();

  try {
    // Ensure schema exists before starting transaction
    await client.query('CREATE SCHEMA IF NOT EXISTS analytics;').catch(() => {});
    
    await client.query('BEGIN');
    console.log('📦 Seeding analytics service...');

    // Clear existing data
    await client.query('DELETE FROM analytics.aggregates').catch(() => {});
    // Note: analytics.events is partitioned, so we'll just insert a few test events

    // Seed Analytics (minimal - a few events and aggregates)
    console.log('Seeding analytics...');
    for (let i = 0; i < 10 && i < buildingIds.length; i++) {
      await client.query(
        `INSERT INTO analytics.events (id, event_type, entity_type, entity_id, session_id, metadata, created_at)
         VALUES (gen_random_uuid(), 'view', 'building', $1, $2, $3::jsonb, NOW())`,
        [buildingIds[i], `session-${i}`, JSON.stringify({ source: 'web' })]
      );
    }

    // Add a few aggregates
    for (const buildingId of buildingIds.slice(0, 5)) {
      await client.query(
        `INSERT INTO analytics.aggregates (id, metric_name, entity_type, entity_id, period_type, period_start, value, created_at, updated_at)
         VALUES (gen_random_uuid(), 'view_count', 'building', $1, 'daily', CURRENT_DATE, $2, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [buildingId, 10 + Math.floor(Math.random() * 50)]
      );
    }
    console.log('✓ Created analytics events and aggregates');

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors (transaction may already be aborted)
    }
    console.error('❌ Analytics seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seed
seed().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
