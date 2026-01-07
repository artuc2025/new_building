import { createPool } from '../db/data-source';
import { config } from 'dotenv';

config();

// Use listings DB URL for perf tests (queries listings.buildings, listings.regions)
const pool = createPool('listings');

async function perfTest() {
  const client = await pool.connect();

  try {
    console.log('⚡ Running database performance test...\n');

    // Step 1: Check current building count
    const countResult = await client.query('SELECT COUNT(*) as count FROM listings.buildings');
    const currentCount = parseInt(countResult.rows[0].count, 10);
    console.log(`📊 Current building count: ${currentCount}`);

    // Step 2: Generate additional buildings if needed to reach ~10K
    const targetCount = 10000;
    if (currentCount < targetCount) {
      const needed = targetCount - currentCount;
      console.log(`🔨 Generating ${needed} additional buildings to reach ${targetCount}...`);

      // Get existing developers and regions for reference
      const devsResult = await client.query('SELECT id FROM listings.developers LIMIT 5');
      const regionsResult = await client.query('SELECT id FROM listings.regions LIMIT 5');
      
      if (devsResult.rows.length === 0 || regionsResult.rows.length === 0) {
        throw new Error('No developers or regions found. Please run seed first.');
      }

      const developerIds = devsResult.rows.map((r: any) => r.id);
      const regionIds = regionsResult.rows.map((r: any) => r.id);

      // Generate buildings in batches for efficiency
      const batchSize = 100;
      const batches = Math.ceil(needed / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchNeeded = Math.min(batchSize, needed - batch * batchSize);
        const values: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        for (let i = 0; i < batchNeeded; i++) {
          const lng = 44.4 + Math.random() * 0.4; // Yerevan area
          const lat = 40.1 + Math.random() * 0.2;
          const priceMin = 200000 + Math.random() * 300000;
          const priceMax = priceMin + 50000 + Math.random() * 100000;
          const areaMin = 40 + Math.random() * 40;
          const areaMax = areaMin + 20 + Math.random() * 40;
          const status = Math.random() > 0.3 ? 'published' : 'draft';
          const developerId = developerIds[Math.floor(Math.random() * developerIds.length)];
          const regionId = regionIds[Math.floor(Math.random() * regionIds.length)];

          values.push(
            `($${paramIndex}::jsonb, $${paramIndex + 1}::jsonb, $${paramIndex + 2}::jsonb, ST_GeogFromText($${paramIndex + 3}), $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14}, $${paramIndex + 15}, $${paramIndex + 16}, $${paramIndex + 17})`
          );

          params.push(
            JSON.stringify({ am: `Նոր Բնակարան ${batch * batchSize + i + 1}`, ru: `Новая Квартира ${batch * batchSize + i + 1}`, en: `New Apartment ${batch * batchSize + i + 1}` }),
            JSON.stringify({ am: `Նկարագրություն`, ru: `Описание`, en: `Description` }),
            JSON.stringify({ am: `Հասցե`, ru: `Адрес`, en: `Address` }),
            `POINT(${lng} ${lat})`,
            'Yerevan',
            5 + Math.floor(Math.random() * 20),
            null,
            null,
            ['planned', 'under_construction', 'completed'][Math.floor(Math.random() * 3)],
            priceMin,
            priceMax,
            areaMin,
            areaMax,
            'AMD',
            developerId,
            regionId,
            status,
            status === 'published' ? new Date() : null
          );

          paramIndex += 18;
        }

        await client.query(
          `INSERT INTO listings.buildings (
            title, description, address, location, city, floors, total_units, commissioning_date,
            construction_status, price_per_m2_min, price_per_m2_max, area_min, area_max, currency,
            developer_id, region_id, status, published_at
          ) VALUES ${values.join(', ')}`,
          params
        );

        if ((batch + 1) % 10 === 0) {
          console.log(`   Generated ${(batch + 1) * batchSize} buildings...`);
        }
      }

      console.log(`✅ Generated ${needed} additional buildings\n`);
    } else {
      console.log(`✅ Already have ${currentCount} buildings (target: ${targetCount})\n`);
    }

    // Step 3: Get sample region_id and developer_id for realistic filter
    const sampleRegion = await client.query('SELECT id FROM listings.regions LIMIT 1');
    const sampleDeveloper = await client.query('SELECT id FROM listings.developers LIMIT 1');
    const regionId = sampleRegion.rows[0]?.id;
    const developerId = sampleDeveloper.rows[0]?.id;

    // Step 4: Execute the most common filtered query
    // This matches the API query: price range + area + region + status + sort by updated_at + pagination
    console.log('🔍 Executing filtered query with EXPLAIN ANALYZE...');
    console.log('   Filters: price range (200K-500K), area (40-100 m²), region, status=published, sort by updated_at DESC, page 1, limit 20\n');

    const query = `
      SELECT 
        b.id,
        b.title,
        b.address,
        b.location,
        b.price_per_m2_min,
        b.price_per_m2_max,
        b.area_min,
        b.area_max,
        b.floors,
        b.commissioning_date,
        b.status,
        b.updated_at,
        d.id as developer_id,
        d.name as developer_name,
        r.id as region_id,
        r.name as region_name
      FROM listings.buildings b
      INNER JOIN listings.developers d ON b.developer_id = d.id
      INNER JOIN listings.regions r ON b.region_id = r.id
      WHERE b.status = 'published'
        AND b.price_per_m2_min >= $1
        AND b.price_per_m2_max <= $2
        AND b.area_min >= $3
        AND b.area_max <= $4
        ${regionId ? 'AND b.region_id = $5' : ''}
      ORDER BY b.updated_at DESC
      LIMIT 20
      OFFSET 0
    `;

    const queryParams: any[] = [200000, 500000, 40, 100];
    if (regionId) {
      queryParams.push(regionId);
    }

    // Run EXPLAIN ANALYZE to get execution plan and timing
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const explainResult = await client.query(explainQuery, queryParams);
    const plan = explainResult.rows[0]['QUERY PLAN'][0];
    const executionTime = plan['Execution Time']; // in milliseconds

    // Also run the actual query to verify it works
    const startTime = process.hrtime.bigint();
    const result = await client.query(query, queryParams);
    const endTime = process.hrtime.bigint();
    const actualTimeMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

    console.log('📈 Query Results:');
    console.log(`   Rows returned: ${result.rows.length}`);
    console.log(`   Execution time (from EXPLAIN ANALYZE): ${executionTime.toFixed(2)} ms`);
    console.log(`   Actual execution time: ${actualTimeMs.toFixed(2)} ms`);
    console.log(`   Planning time: ${plan['Planning Time']?.toFixed(2) || 'N/A'} ms`);
    console.log('');

    // Check if indexes were used
    const planStr = JSON.stringify(plan);
    const usesIndex = planStr.includes('Index') || planStr.includes('index');
    console.log(`   Index usage: ${usesIndex ? '✅ Yes' : '⚠️  No (may need index tuning)'}`);
    console.log('');

    // Step 5: Performance target check
    const targetMs = 200;
    const passed = executionTime < targetMs;

    if (passed) {
      console.log(`✅ Performance test PASSED: ${executionTime.toFixed(2)} ms < ${targetMs} ms target`);
      process.exit(0);
    } else {
      console.log(`❌ Performance test FAILED: ${executionTime.toFixed(2)} ms >= ${targetMs} ms target`);
      console.log('');
      console.log('💡 Suggestions:');
      console.log('   - Verify indexes exist on: price_per_m2_min, price_per_m2_max, area_min, area_max, region_id, status, updated_at');
      console.log('   - Check for composite indexes that match the query pattern');
      console.log('   - Consider VACUUM ANALYZE on listings.buildings');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

perfTest();

