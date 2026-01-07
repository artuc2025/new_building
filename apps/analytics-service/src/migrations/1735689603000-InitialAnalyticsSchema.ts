import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAnalyticsSchema1735689603000 implements MigrationInterface {
  name = 'InitialAnalyticsSchema1735689603000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if not exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS analytics;`);

    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Create partitioned events table (parent)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS analytics.events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        session_id VARCHAR(100),
        metadata JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      ) PARTITION BY RANGE (created_at);
    `);

    // Create initial monthly partitions for current and next months
    // Note: For production, a tool should create future partitions automatically
    // For local dev, creating 12 months should be sufficient
    const currentDate = new Date();
    const monthsToCreate = 12;
    for (let i = 0; i < monthsToCreate; i++) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i + 1, 1);
      const partitionName = `analytics.events_${monthDate.getFullYear()}_${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF analytics.events
        FOR VALUES FROM ('${monthDate.toISOString()}') TO ('${nextMonthDate.toISOString()}');
      `);

      // Create indexes on partition
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_events_type_entity_${monthDate.getFullYear()}_${String(monthDate.getMonth() + 1).padStart(2, '0')}
        ON ${partitionName}(event_type, entity_type, entity_id);
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_events_created_at_${monthDate.getFullYear()}_${String(monthDate.getMonth() + 1).padStart(2, '0')}
        ON ${partitionName}(created_at DESC);
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_events_session_${monthDate.getFullYear()}_${String(monthDate.getMonth() + 1).padStart(2, '0')}
        ON ${partitionName}(session_id) WHERE session_id IS NOT NULL;
      `);
    }

    // Create aggregates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS analytics.aggregates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_name VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
        period_start TIMESTAMPTZ NOT NULL,
        value BIGINT NOT NULL DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(metric_name, entity_type, entity_id, period_type, period_start)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_aggregates_entity ON analytics.aggregates(entity_type, entity_id, period_type, period_start DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_aggregates_metric ON analytics.aggregates(metric_name, period_type, period_start DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop aggregates table
    await queryRunner.query(`DROP TABLE IF EXISTS analytics.aggregates;`);

    // Drop partitions (need to drop all partitions before dropping parent)
    // Get list of partitions and drop them
    const partitionResult = await queryRunner.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'analytics' 
      AND tablename LIKE 'events_%';
    `);

    for (const row of partitionResult) {
      await queryRunner.query(`DROP TABLE IF EXISTS analytics.${row.tablename};`);
    }

    // Drop parent events table
    await queryRunner.query(`DROP TABLE IF EXISTS analytics.events;`);
    
    // Drop schema
    await queryRunner.query(`DROP SCHEMA IF EXISTS analytics;`);
  }
}

