import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Pool } from 'pg';

config();

// Shared database URL
const getDatabaseUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_LISTINGS ||
    'postgresql://postgres:postgres@localhost:5432/new_building_portal'
  );
};

// Create a raw PostgreSQL connection pool for direct SQL queries
export const createPool = (): Pool => {
  const url = getDatabaseUrl();
  return new Pool({ connectionString: url });
};

// Data sources for each service (for TypeORM entity operations)
export const listingsDataSource = new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  schema: 'listings',
  synchronize: false,
  logging: false,
  entities: [],
});

export const mediaDataSource = new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  schema: 'media',
  synchronize: false,
  logging: false,
  entities: [],
});

export const contentDataSource = new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  schema: 'content',
  synchronize: false,
  logging: false,
  entities: [],
});

export const analyticsDataSource = new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  schema: 'analytics',
  synchronize: false,
  logging: false,
  entities: [],
});

