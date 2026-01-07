import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMediaSchema1735689601000 implements MigrationInterface {
  name = 'InitialMediaSchema1735689601000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if not exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS media;`);

    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Create assets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS media.assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        bucket VARCHAR(100) NOT NULL,
        object_key VARCHAR(500) NOT NULL,
        width INTEGER,
        height INTEGER,
        alt_text JSONB,
        caption JSONB,
        processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
        processing_error TEXT,
        variants JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(bucket, object_key)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assets_processing_status ON media.assets(processing_status) WHERE processing_status IN ('pending', 'processing');
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assets_mime_type ON media.assets(mime_type);
    `);

    // Create processing_jobs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS media.processing_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        media_id UUID NOT NULL REFERENCES media.assets(id) ON DELETE CASCADE,
        job_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON media.processing_jobs(status) WHERE status IN ('queued', 'processing');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS media.processing_jobs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS media.assets;`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS media;`);
  }
}

