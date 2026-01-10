# Search Service

Search Service for the Real Estate Portal, providing full-text search via Meilisearch and geospatial queries via PostGIS.

## Features

- **Full-text search**: Meilisearch integration for building search with filters and faceting
- **Geospatial search**: PostGIS-based map bounds queries using read-model `search.building_locations`
- **Event-driven sync**: NATS JetStream consumers for synchronizing building data
- **Idempotent processing**: Inbox pattern ensures duplicate events are safely handled
- **Search analytics**: Tracks queries, results, and performance metrics

## Prerequisites

1. **PostgreSQL** with PostGIS extension
2. **Meilisearch** (default: `http://localhost:7700`)
3. **NATS JetStream** (default: `nats://localhost:4222`)

## Environment Variables

Create a `.env` file in the project root or set these environment variables:

```bash
# Database (uses listings DB by default in MVP)
SEARCH_DB_HOST=localhost
SEARCH_DB_PORT=5432
SEARCH_DB_USER=postgres
SEARCH_DB_PASSWORD=postgres
SEARCH_DB_NAME=new_building_portal

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_MASTER_KEY=dev_master_key_change_in_prod

# NATS
NATS_URL=nats://localhost:4222

# Service
SEARCH_SERVICE_PORT=3002
NODE_ENV=development
```

**Note**: If using docker-compose, the Meilisearch master key defaults to `dev_master_key_change_in_prod`.

## Setup

### 1. Run Database Migrations

```bash
cd apps/search-service
pnpm migration:run
```

This creates:
- `search` schema
- `search.building_locations` (read-model for map queries)
- `search.search_analytics` (query analytics)
- `search.index_sync_status` (sync status tracking)
- `search.inbox` (idempotent event processing)

### 2. Start the Service

```bash
# From project root
pnpm --filter @new-building-portal/search-service serve

# Or from service directory
cd apps/search-service
pnpm serve
```

The service will:
- Connect to PostgreSQL and verify schema
- Connect to Meilisearch and create/configure the `buildings` index
- Connect to NATS JetStream and start consuming building events

## API Endpoints

### Search Buildings (Full-text)

```http
GET /v1/search/buildings?q=apartment&pricePerM2Min=500000&regionId=uuid&page=1&limit=20
```

**Query Parameters:**
- `q` (optional): Search query text
- `pricePerM2Min`, `pricePerM2Max`: Price range filters
- `areaMin`, `areaMax`: Area range filters
- `regionId`: Filter by region UUID
- `developerId`: Filter by developer UUID
- `status`: Filter by status (`draft`, `published`, `archived`)
- `page`: Page number (default: 1)
- `limit`: Page size (default: 20, max: 100)
- `sortBy`: Sort field (`pricePerM2Min`, `updatedAt`, `commissioningDate`)
- `sortOrder`: Sort direction (`asc`, `desc`)

### Search Buildings (Map Bounds)

```http
GET /v1/search/buildings/map?bounds=40.1811,44.5091,40.1911,44.5191
```

**Query Parameters:**
- `bounds` (required): Bounding box as `"southWestLat,southWestLng,northEastLat,northEastLng"`

**Note**: This endpoint queries the `search.building_locations` PostGIS table, NOT Meilisearch or the listings schema.

## Architecture

### Service Boundaries

- **MUST NOT** query `listings.*` schema directly
- **MUST** use event-driven read-model (`search.building_locations`) for geospatial queries
- **MUST** populate read-model by consuming `listings.building.*` events

### Event Consumption

The service consumes these NATS JetStream events:
- `listings.building.created` → Add to Meilisearch + read-model
- `listings.building.updated` → Update Meilisearch + read-model
- `listings.building.published` → Update visibility in Meilisearch
- `listings.building.deleted` → Remove from Meilisearch + read-model

### Idempotency

Events are processed idempotently using the inbox pattern:
- Each event has a unique `eventId`
- Events are stored in `search.inbox` before processing
- Duplicate events are safely ignored

## Migration Commands

```bash
# Run migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert

# Generate new migration
pnpm migration:generate --name=MigrationName

# Diagnose migration setup
pnpm migration:diagnose
```

## Troubleshooting

### Meilisearch Connection Issues

If you see `invalid_api_key` errors:

1. Check Meilisearch is running:
   ```bash
   curl http://localhost:7700/health
   ```

2. Verify the API key matches:
   ```bash
   docker exec meilisearch-dev printenv MEILI_MASTER_KEY
   ```

3. Set the environment variable:
   ```bash
   export MEILISEARCH_MASTER_KEY=dev_master_key_change_in_prod
   ```

### NATS Connection Issues

If events aren't being consumed:

1. Check NATS is running:
   ```bash
   curl http://localhost:8222/healthz
   ```

2. Verify the stream exists:
   ```bash
   nats stream ls
   ```

3. Check consumer status:
   ```bash
   nats consumer info listings-events search-consumer
   ```

### Database Connection Issues

1. Verify PostgreSQL is running and accessible
2. Check the `search` schema exists:
   ```sql
   SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'search';
   ```

3. Run migrations if schema is missing:
   ```bash
   pnpm migration:run
   ```

## Development

### Project Structure

```
apps/search-service/
├── src/
│   ├── entities/          # TypeORM entities (search schema)
│   ├── services/          # Business logic
│   │   ├── meilisearch.service.ts
│   │   ├── search.service.ts
│   │   └── search-sync.service.ts
│   ├── dto/               # Request/response DTOs
│   ├── migrations/        # TypeORM migrations
│   ├── migration-cli/     # Migration scripts
│   ├── search.controller.ts
│   ├── search.module.ts
│   ├── app.module.ts
│   ├── main.ts
│   └── data-source.ts
├── package.json
└── tsconfig.json
```

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:cov
```

## Swagger Documentation

Once the service is running, access Swagger UI at:
```
http://localhost:3002/api-docs
```
