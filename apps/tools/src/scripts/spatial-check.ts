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
      `SELECT id, title, 
              ST_Distance(location, ST_GeogFromText('POINT(44.5091 40.1811)')) as distance_meters
       FROM listings.buildings
       WHERE ST_DWithin(location, ST_GeogFromText('POINT(44.5091 40.1811)'), 2000)
       ORDER BY distance_meters
       LIMIT 5`
    );
    console.log(`   ✓ Found ${distanceResult.rows.length} buildings within 2000m`);
    if (distanceResult.rows.length > 0) {
      console.log(`   Sample building IDs: ${distanceResult.rows.slice(0, 3).map((r: any) => r.id.substring(0, 8)).join(', ')}`);
    }
    console.log('');

    // Check 2: Bounding box query (buildings within map bounds)
    console.log('2️⃣  Bounding Box Query: Finding buildings within map bounds (44.4-44.6, 40.1-40.2)');
    const bboxResult = await client.query(
      `SELECT id, title
       FROM listings.buildings
       WHERE ST_Within(
         location::geometry,
         ST_MakeEnvelope(44.4, 40.1, 44.6, 40.2, 4326)
       )
       LIMIT 10`
    );
    console.log(`   ✓ Found ${bboxResult.rows.length} buildings in bounding box`);
    if (bboxResult.rows.length > 0) {
      console.log(`   Sample building IDs: ${bboxResult.rows.slice(0, 3).map((r: any) => r.id.substring(0, 8)).join(', ')}`);
    }
    console.log('');

    // Check 3: Point-in-polygon query (buildings whose point is inside a region boundary)
    console.log('3️⃣  Point-in-Polygon Query: Finding buildings inside region boundaries');
    const pipResult = await client.query(
      `SELECT b.id, b.title, r.name as region_name
       FROM listings.buildings b
       INNER JOIN listings.regions r ON b.region_id = r.id
       WHERE r.boundary IS NOT NULL
         AND ST_Within(b.location::geometry, r.boundary::geometry)
       LIMIT 10`
    );
    console.log(`   ✓ Found ${pipResult.rows.length} buildings inside region boundaries`);
    if (pipResult.rows.length > 0) {
      const regionName = pipResult.rows[0].region_name;
      const regionNameObj = typeof regionName === 'string' ? JSON.parse(regionName) : regionName;
      console.log(`   Sample: Building ${pipResult.rows[0].id.substring(0, 8)} in region ${regionNameObj?.en || 'N/A'}`);
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
      distanceResult.rows.length > 0 &&
      bboxResult.rows.length > 0 &&
      pipResult.rows.length > 0 &&
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

