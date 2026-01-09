import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const host = process.env.ANALYTICS_DB_HOST || 'localhost';
const port = parseInt(process.env.ANALYTICS_DB_PORT || '5432', 10);
const username = process.env.ANALYTICS_DB_USER || 'postgres';
const password = process.env.ANALYTICS_DB_PASSWORD || 'postgres';
const database = process.env.ANALYTICS_DB_NAME || 'new_building_portal';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  schema: 'analytics',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/entities/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,
});

