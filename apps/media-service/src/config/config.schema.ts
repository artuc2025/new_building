import * as Joi from 'joi';

/**
 * Configuration validation schema for Media Service
 * Validates all environment variables on startup
 * Required fields must be provided, optional fields have defaults
 */
export const configValidationSchema = Joi.object({
  // Database Configuration (with defaults for development)
  MEDIA_DB_HOST: Joi.string().optional().default('localhost'),
  MEDIA_DB_PORT: Joi.number().port().optional().default(5432),
  MEDIA_DB_USER: Joi.string().optional().default('postgres'),
  MEDIA_DB_PASSWORD: Joi.string().optional().default('postgres'),
  MEDIA_DB_NAME: Joi.string().optional().default('new_building_portal'),

  // MinIO Configuration (with defaults for development)
  MINIO_ENDPOINT: Joi.string().optional().default('localhost'),
  MINIO_PORT: Joi.number().port().optional().default(9000),
  MINIO_USE_SSL: Joi.string().valid('true', 'false').optional().default('false'),
  MINIO_ROOT_USER: Joi.string().optional().default('minioadmin'),
  MINIO_ROOT_PASSWORD: Joi.string().optional().default('minioadmin'),

  // NATS Configuration (with default)
  NATS_URL: Joi.string().uri().optional().default('nats://localhost:4222'),

  // Service Configuration (optional with defaults)
  MEDIA_SERVICE_PORT: Joi.number().port().optional().default(3003),
  API_PREFIX: Joi.string().allow('').optional().default(''),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').optional().default('development'),
});
