import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToBuildings1735690000000 implements MigrationInterface {
  name = 'AddDeletedAtToBuildings1735690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE listings.buildings
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_deleted_at 
      ON listings.buildings(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS listings.idx_buildings_deleted_at;
    `);

    await queryRunner.query(`
      ALTER TABLE listings.buildings
      DROP COLUMN IF EXISTS deleted_at;
    `);
  }
}

