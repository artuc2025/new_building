import { AppDataSource } from '../data-source';

AppDataSource.initialize()
  .then(async () => {
    // Create schema if it doesn't exist (needed before TypeORM creates migrations table)
    const queryRunner = AppDataSource.createQueryRunner();
    try {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS analytics;`);
      console.log('Schema "analytics" ensured');
    } catch (error) {
      console.warn('Warning: Could not create schema (may already exist):', error);
    } finally {
      await queryRunner.release();
    }

    console.log('Running migrations...');
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully');
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running migrations:', error);
    process.exit(1);
  });

