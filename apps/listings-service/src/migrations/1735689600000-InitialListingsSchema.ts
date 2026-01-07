import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialListingsSchema1735689600000 implements MigrationInterface {
  name = 'InitialListingsSchema1735689600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if not exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS listings;`);

    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Create developers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS listings.developers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name JSONB NOT NULL,
        description JSONB,
        logo_media_id UUID,
        website_url VARCHAR(500),
        email VARCHAR(255),
        phone VARCHAR(50),
        address JSONB,
        established_year INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_developers_name ON listings.developers USING GIN(name);
    `);

    // Create regions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS listings.regions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name JSONB NOT NULL,
        parent_region_id UUID REFERENCES listings.regions(id),
        region_type VARCHAR(50) NOT NULL CHECK (region_type IN ('city', 'district', 'neighborhood')),
        boundary GEOGRAPHY(POLYGON, 4326),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_regions_parent ON listings.regions(parent_region_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_regions_boundary ON listings.regions USING GIST(boundary) WHERE boundary IS NOT NULL;
    `);

    // Create buildings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS listings.buildings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title JSONB NOT NULL,
        description JSONB,
        address JSONB NOT NULL,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        address_line_1 VARCHAR(255),
        address_line_2 VARCHAR(255),
        city VARCHAR(100) NOT NULL DEFAULT 'Yerevan',
        postal_code VARCHAR(20),
        floors INTEGER NOT NULL CHECK (floors > 0),
        total_units INTEGER,
        commissioning_date DATE,
        construction_status VARCHAR(50) CHECK (construction_status IN ('planned', 'under_construction', 'completed')),
        price_per_m2_min DECIMAL(12, 2),
        price_per_m2_max DECIMAL(12, 2),
        area_min DECIMAL(8, 2) NOT NULL CHECK (area_min > 0),
        area_max DECIMAL(8, 2) NOT NULL CHECK (area_max >= area_min),
        currency VARCHAR(3) NOT NULL DEFAULT 'AMD',
        developer_id UUID NOT NULL REFERENCES listings.developers(id) ON DELETE RESTRICT,
        region_id UUID NOT NULL REFERENCES listings.regions(id) ON DELETE RESTRICT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        is_featured BOOLEAN DEFAULT FALSE,
        developer_website_url VARCHAR(500),
        developer_facebook_url VARCHAR(500),
        developer_instagram_url VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        published_at TIMESTAMPTZ,
        created_by UUID,
        search_vector TSVECTOR GENERATED ALWAYS AS (
          to_tsvector('simple', COALESCE(title->>'am', '') || ' ' || COALESCE(description->>'am', '')) ||
          to_tsvector('simple', COALESCE(title->>'ru', '') || ' ' || COALESCE(description->>'ru', '')) ||
          to_tsvector('simple', COALESCE(title->>'en', '') || ' ' || COALESCE(description->>'en', ''))
        ) STORED
      );
    `);

    // Create indexes for buildings
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_location ON listings.buildings USING GIST(location);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_status ON listings.buildings(status) WHERE status = 'published';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_developer ON listings.buildings(developer_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_region ON listings.buildings(region_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_commissioning_date ON listings.buildings(commissioning_date) WHERE commissioning_date IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_price_range ON listings.buildings(price_per_m2_min, price_per_m2_max) WHERE status = 'published';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_area_range ON listings.buildings(area_min, area_max) WHERE status = 'published';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_updated_at ON listings.buildings(updated_at DESC) WHERE status = 'published';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_featured ON listings.buildings(is_featured) WHERE is_featured = TRUE AND status = 'published';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_search_vector ON listings.buildings USING GIN(search_vector);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_status_region_price ON listings.buildings(status, region_id, price_per_m2_min) WHERE status = 'published';
    `);

    // Create pricing_snapshots table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS listings.pricing_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id UUID NOT NULL REFERENCES listings.buildings(id) ON DELETE CASCADE,
        price_per_m2_min DECIMAL(12, 2) NOT NULL,
        price_per_m2_max DECIMAL(12, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'AMD',
        area_min DECIMAL(8, 2),
        area_max DECIMAL(8, 2),
        snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(building_id, snapshot_date)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_building_date ON listings.pricing_snapshots(building_id, snapshot_date DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_date ON listings.pricing_snapshots(snapshot_date DESC);
    `);

    // Create building_images table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS listings.building_images (
        building_id UUID NOT NULL REFERENCES listings.buildings(id) ON DELETE CASCADE,
        media_id UUID NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (building_id, media_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_building_images_order ON listings.building_images(building_id, display_order);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_building_images_primary ON listings.building_images(building_id) WHERE is_primary = TRUE;
    `);

    // Create building_submissions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS listings.building_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title JSONB,
        address JSONB,
        location GEOGRAPHY(POINT, 4326),
        developer_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
        converted_to_building_id UUID REFERENCES listings.buildings(id),
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_status ON listings.building_submissions(status) WHERE status = 'pending';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS listings.building_submissions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.building_images;`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.pricing_snapshots;`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.buildings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.regions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.developers;`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS listings;`);
  }
}

