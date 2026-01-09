import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const host = process.env.LISTINGS_DB_HOST || 'localhost';
const port = parseInt(process.env.LISTINGS_DB_PORT || '5432', 10);
const username = process.env.LISTINGS_DB_USER || 'postgres';
const password = process.env.LISTINGS_DB_PASSWORD || 'postgres';
const database = process.env.LISTINGS_DB_NAME || 'new_building_portal';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  schema: 'listings',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/entities/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,
});

