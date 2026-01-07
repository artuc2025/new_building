import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || process.env.DATABASE_URL_LISTINGS || 'postgresql://postgres:postgres@localhost:5432/new_building_portal',
  schema: 'listings',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/**/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,
});

