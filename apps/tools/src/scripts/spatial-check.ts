import { createPool } from '../db/data-source';
import { config } from 'dotenv';

config();

// Use listings DB URL for spatial checks (queries listings.buildings, listings.regions)
const pool = createPool('listings');

async function spatialCheck() {
  const client = await pool.connect();

  try {
    console.log('🔍 Running PostGIS spatial verification checks...\n');

    // Check 1: Distance query (find buildings within X meters of a point)
    console.log('1️⃣  Distance Query: Finding buildings within 2000m of Yerevan center (40.1811, 44.5091)');
    const distanceResult = await client.query(
      `SELECT b.id AS building_id, b.region_id,
              ST_Distance(b.location, ST_GeogFromText('POINT(44.5091 40.1811)')) as distance_meters
       FROM listings.buildings b
       WHERE ST_DWithin(b.location, ST_GeogFromText('POINT(44.5091 40.1811)'), 2000)
       ORDER BY b.id ASC
       LIMIT 2`
    );
    const distanceCount = await client.query(
      `SELECT COUNT(*) as count
       FROM listings.buildings
       WHERE ST_DWithin(location, ST_GeogFromText('POINT(44.5091 40.1811)'), 2000)`
    );
    const distanceTotal = parseInt(distanceCount.rows[0].count, 10);
    console.log(`   ✓ Found ${distanceTotal} buildings within 2000m`);
    if (distanceResult.rows.length > 0) {
      const samples = distanceResult.rows.map((r: any) => ({
        region_id: r.region_id,
        building_id: r.building_id,
      }));
      console.log(`   [spatial] distance count=${distanceTotal} samples:`, JSON.stringify(samples));
    }
    console.log('');

    // Check 2: Bounding box query (buildings within map bounds)
    console.log('2️⃣  Bounding Box Query: Finding buildings within map bounds (44.4-44.6, 40.1-40.2)');
    const bboxResult = await client.query(
      `SELECT b.id AS building_id, b.region_id
       FROM listings.buildings b
       WHERE ST_Within(
         b.location::geometry,
         ST_MakeEnvelope(44.4, 40.1, 44.6, 40.2, 4326)
       )
       ORDER BY b.id ASC
       LIMIT 2`
    );
    const bboxCount = await client.query(
      `SELECT COUNT(*) as count
       FROM listings.buildings
       WHERE ST_Within(
         location::geometry,
         ST_MakeEnvelope(44.4, 40.1, 44.6, 40.2, 4326)
       )`
    );
    const bboxTotal = parseInt(bboxCount.rows[0].count, 10);
    console.log(`   ✓ Found ${bboxTotal} buildings in bounding box`);
    if (bboxResult.rows.length > 0) {
      const samples = bboxResult.rows.map((r: any) => ({
        region_id: r.region_id,
        building_id: r.building_id,
      }));
      console.log(`   [spatial] bbox count=${bboxTotal} samples:`, JSON.stringify(samples));
    }
    console.log('');

    // Check 3: Point-in-polygon query (buildings whose point is inside a region boundary)
    console.log('3️⃣  Point-in-Polygon Query: Finding buildings inside region boundaries');
    const pipResult = await client.query(
      `SELECT b.id AS building_id, r.id AS region_id
       FROM listings.buildings b
       INNER JOIN listings.regions r ON b.region_id = r.id
       WHERE r.boundary IS NOT NULL
         AND ST_Within(b.location::geometry, r.boundary::geometry)
       ORDER BY b.id ASC
       LIMIT 2`
    );
    const pipCount = await client.query(
      `SELECT COUNT(*) as count
       FROM listings.buildings b
       INNER JOIN listings.regions r ON b.region_id = r.id
       WHERE r.boundary IS NOT NULL
         AND ST_Within(b.location::geometry, r.boundary::geometry)`
    );
    const pipTotal = parseInt(pipCount.rows[0].count, 10);
    console.log(`   ✓ Found ${pipTotal} buildings inside region boundaries`);
    if (pipResult.rows.length > 0) {
      const samples = pipResult.rows.map((r: any) => ({
        region_id: r.region_id,
        building_id: r.building_id,
      }));
      console.log(`   [spatial] point-in-polygon count=${pipTotal} samples:`, JSON.stringify(samples));
    }
    console.log('');

    // Verify PostGIS extension is enabled
    const extResult = await client.query(
      `SELECT EXISTS(
         SELECT 1 FROM pg_extension WHERE extname = 'postgis'
       ) as postgis_enabled`
    );
    const postgisEnabled = extResult.rows[0].postgis_enabled;
    console.log(`4️⃣  PostGIS Extension: ${postgisEnabled ? '✅ Enabled' : '❌ Not enabled'}`);
    console.log('');

    // Summary
    const allChecksPassed = 
      distanceTotal > 0 &&
      bboxTotal > 0 &&
      pipTotal > 0 &&
      postgisEnabled;

    if (allChecksPassed) {
      console.log('✅ All PostGIS spatial checks passed!');
      process.exit(0);
    } else {
      console.log('⚠️  Some checks did not pass. Please verify your data and PostGIS setup.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Spatial check failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

spatialCheck();

