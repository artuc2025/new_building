import * as Joi from 'joi';

/**
 * Configuration validation schema for Media Service
 * Validates all environment variables on startup
 * Required fields must be provided, optional fields have defaults
 */
export const configValidationSchema = Joi.object({
  // Database Configuration (all required)
  MEDIA_DB_HOST: Joi.string().required(),
  MEDIA_DB_PORT: Joi.number().port().required(),
  MEDIA_DB_USER: Joi.string().required(),
  MEDIA_DB_PASSWORD: Joi.string().required(),
  MEDIA_DB_NAME: Joi.string().required(),

  // MinIO Configuration (all required)
  MINIO_ENDPOINT: Joi.string().required(),
  MINIO_PORT: Joi.number().port().required(),
  MINIO_USE_SSL: Joi.string().valid('true', 'false').optional().default('false'),
  MINIO_ROOT_USER: Joi.string().required(),
  MINIO_ROOT_PASSWORD: Joi.string().required(),

  // NATS Configuration (required)
  NATS_URL: Joi.string().uri().required(),

  // Service Configuration (optional with defaults)
  MEDIA_SERVICE_PORT: Joi.number().port().optional().default(3003),
  API_PREFIX: Joi.string().allow('').optional().default(''),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').optional().default('development'),
});
