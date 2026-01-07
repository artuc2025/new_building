import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Pool } from 'pg';

config();

type ServiceName = 'listings' | 'content' | 'media' | 'analytics';

/**
 * Get database URL for a specific service.
 * Supports per-service DB URLs (DATABASE_URL_LISTINGS, etc.) with fallback to shared DATABASE_URL.
 */
export const getDbUrl = (serviceName: ServiceName): string => {
  // Try per-service URL first
  const serviceUrl = process.env[`DATABASE_URL_${serviceName.toUpperCase()}`];
  if (serviceUrl) {
    return serviceUrl;
  }

  // Fallback to shared DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Default fallback
  return 'postgresql://postgres:postgres@localhost:5432/new_building_portal';
};

// Legacy function for backward compatibility (uses listings DB URL)
const getDatabaseUrl = (): string => {
  return getDbUrl('listings');
};

// Create a raw PostgreSQL connection pool for direct SQL queries
// Uses listings DB URL by default (for backward compatibility)
export const createPool = (serviceName?: ServiceName): Pool => {
  const url = serviceName ? getDbUrl(serviceName) : getDatabaseUrl();
  return new Pool({ connectionString: url });
};

// Data sources for each service (for TypeORM entity operations)
export const listingsDataSource = new DataSource({
  type: 'postgres',
  url: getDbUrl('listings'),
  schema: 'listings',
  synchronize: false,
  logging: false,
  entities: [],
});

export const mediaDataSource = new DataSource({
  type: 'postgres',
  url: getDbUrl('media'),
  schema: 'media',
  synchronize: false,
  logging: false,
  entities: [],
});

export const contentDataSource = new DataSource({
  type: 'postgres',
  url: getDbUrl('content'),
  schema: 'content',
  synchronize: false,
  logging: false,
  entities: [],
});

export const analyticsDataSource = new DataSource({
  type: 'postgres',
  url: getDbUrl('analytics'),
  schema: 'analytics',
  synchronize: false,
  logging: false,
  entities: [],
});

