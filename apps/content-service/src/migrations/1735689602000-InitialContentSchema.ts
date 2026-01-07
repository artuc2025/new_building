import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialContentSchema1735689602000 implements MigrationInterface {
  name = 'InitialContentSchema1735689602000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if not exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS content;`);

    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Create articles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS content.articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) NOT NULL UNIQUE,
        title JSONB NOT NULL,
        excerpt JSONB,
        body JSONB NOT NULL,
        featured_image_media_id UUID,
        author_id UUID,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_status ON content.articles(status) WHERE status = 'published';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_slug ON content.articles(slug);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_published_at ON content.articles(published_at DESC) WHERE status = 'published';
    `);

    // Create seo_metadata table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS content.seo_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        meta_title JSONB,
        meta_description JSONB,
        og_title JSONB,
        og_description JSONB,
        og_image_media_id UUID,
        canonical_url VARCHAR(500),
        structured_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(entity_type, entity_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_seo_metadata_entity ON content.seo_metadata(entity_type, entity_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS content.seo_metadata;`);
    await queryRunner.query(`DROP TABLE IF EXISTS content.articles;`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS content;`);
  }
}

