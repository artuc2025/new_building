import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSearchSchema1735689603000 implements MigrationInterface {
  name = 'InitialSearchSchema1735689603000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if not exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS search;`);

    // Enable extensions (if not already enabled)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Create building_locations table (read-model for map queries)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search.building_locations (
        building_id UUID PRIMARY KEY,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        metadata JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create GIST index for geospatial queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_building_locations_location 
      ON search.building_locations USING GIST(location);
    `);

    // Create index on metadata for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_building_locations_metadata 
      ON search.building_locations USING GIN(metadata);
    `);

    // Create search_analytics table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search.search_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query TEXT,
        filters JSONB,
        result_count INTEGER NOT NULL DEFAULT 0,
        is_zero_result BOOLEAN NOT NULL DEFAULT FALSE,
        execution_time_ms INTEGER NOT NULL,
        search_type VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at_query 
      ON search.search_analytics(created_at, query);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_query_result_count 
      ON search.search_analytics(query, result_count);
    `);

    // Create index_sync_status table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search.index_sync_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        last_synced_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(entity_type, entity_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_index_sync_status_entity 
      ON search.index_sync_status(entity_type, entity_id);
    `);

    // Create inbox table for idempotent event processing
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search.inbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id VARCHAR(100) NOT NULL UNIQUE,
        event_type VARCHAR(100) NOT NULL,
        aggregate_id UUID NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
        processed_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inbox_status 
      ON search.inbox(status, created_at) WHERE status = 'pending';
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_event_id 
      ON search.inbox(event_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS search.inbox;`);
    await queryRunner.query(`DROP TABLE IF EXISTS search.index_sync_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS search.search_analytics;`);
    await queryRunner.query(`DROP TABLE IF EXISTS search.building_locations;`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS search;`);
  }
}
