# Media Service

Media Service for the Real Estate Portal, responsible for handling file uploads, storing them in MinIO, processing images (resizing/thumbnails), and tracking metadata in PostgreSQL.

## Features

- **File Upload**: Accepts image files via multipart/form-data
- **MinIO Storage**: Stores original and processed images in S3-compatible storage
- **Image Processing**: Generates variants (thumbnail, medium, large) using Sharp
- **Metadata Tracking**: Stores file metadata in PostgreSQL
- **Event Publishing**: Publishes `media.image.processed` events via NATS

## Prerequisites

1. **PostgreSQL** with `media` schema
2. **MinIO** (default: `http://localhost:9000`)
3. **NATS JetStream** (default: `nats://localhost:4222`)

## Environment Variables

Create a `.env` file in the project root or set these environment variables:

```bash
# Database Configuration
MEDIA_DB_HOST=localhost
MEDIA_DB_PORT=5432
MEDIA_DB_USER=postgres
MEDIA_DB_PASSWORD=postgres
MEDIA_DB_NAME=new_building_portal

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# NATS Configuration
NATS_URL=nats://localhost:4222

# Service Configuration
MEDIA_SERVICE_PORT=3003
API_PREFIX=
NODE_ENV=development
```

**Note**: If using docker-compose, MinIO credentials default to `minioadmin`/`minioadmin`.

## Setup

### 1. Run Database Migrations

```bash
cd apps/media-service
pnpm migration:run
```

This creates:
- `media` schema
- `media.assets` (file metadata, MinIO bucket/key, processing status)
- `media.processing_jobs` (queue status, retry count, errors)

### 2. Ensure MinIO Buckets Exist

The service automatically creates required buckets on startup:
- `buildings-media` - Processed images for buildings
- `blog-media` - Processed images for blog posts
- `raw` - Original uploaded images

If using docker-compose, the `minio-setup` service creates these buckets automatically.

### 3. Start the Service

```bash
# From project root
pnpm --filter @new-building-portal/media-service serve

# Or from service directory
cd apps/media-service
pnpm serve
```

The service will:
- Connect to PostgreSQL and verify `media` schema
- Connect to MinIO and ensure buckets exist
- Connect to NATS JetStream for event publishing
- Start listening on port 3003 (or `MEDIA_SERVICE_PORT`)

## API Endpoints

### POST /v1/media/upload

Upload an image file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field name: `file`
- Max file size: 10MB
- Allowed types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

**Response:**
```json
{
  "id": "uuid",
  "original_filename": "example.jpg",
  "mime_type": "image/jpeg",
  "file_size": 1234567,
  "bucket": "raw",
  "object_key": "raw/uuid.jpg",
  "width": 1920,
  "height": 1080,
  "processing_status": "processing",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### GET /v1/media/:id

Get media asset metadata with signed URLs.

**Response:**
```json
{
  "id": "uuid",
  "original_filename": "example.jpg",
  "mime_type": "image/jpeg",
  "file_size": 1234567,
  "bucket": "raw",
  "object_key": "raw/uuid.jpg",
  "width": 1920,
  "height": 1080,
  "processing_status": "completed",
  "variants": {
    "thumbnail": "processed/uuid/thumbnail.jpg",
    "medium": "processed/uuid/medium.jpg",
    "large": "processed/uuid/large.jpg"
  },
  "urls": {
    "original": "https://minio:9000/raw/uuid.jpg?X-Amz-Algorithm=...",
    "variants": {
      "thumbnail": "https://minio:9000/buildings-media/processed/uuid/thumbnail.jpg?X-Amz-Algorithm=...",
      "medium": "https://minio:9000/buildings-media/processed/uuid/medium.jpg?X-Amz-Algorithm=...",
      "large": "https://minio:9000/buildings-media/processed/uuid/large.jpg?X-Amz-Algorithm=..."
    }
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Image Processing

When an image is uploaded:

1. Original file is saved to MinIO `raw` bucket
2. Asset record is created in database with `processing_status: 'pending'`
3. Image processing starts:
   - Extracts metadata (width, height, format)
   - Generates variants:
     - **thumbnail**: 200x200px
     - **medium**: 800x800px
     - **large**: 1200x1200px
4. Variants are uploaded to `buildings-media` bucket
5. Asset record is updated with variant object keys
6. `media.image.processed` event is published via NATS

## Events

### media.image.processed

Published when image processing completes successfully.

**Payload:**
```json
{
  "mediaId": "uuid",
  "variants": {
    "thumbnail": "https://minio:9000/buildings-media/processed/uuid/thumbnail.jpg?X-Amz-Algorithm=...",
    "medium": "https://minio:9000/buildings-media/processed/uuid/medium.jpg?X-Amz-Algorithm=...",
    "large": "https://minio:9000/buildings-media/processed/uuid/large.jpg?X-Amz-Algorithm=..."
  },
  "status": "completed"
}
```

## Error Handling

- **File size exceeded**: Returns 400 if file > 10MB
- **Invalid file type**: Returns 400 if file is not an image
- **Processing failure**: Asset status set to `failed`, error stored in `processing_error`
- **MinIO connection failure**: Service logs error but continues (buckets created on retry)
- **NATS connection failure**: Events are silently dropped (service continues)

## Development

### Running Tests

```bash
pnpm test
```

### Building

```bash
pnpm build
```

### Running Migrations

```bash
# Run migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert

# Generate new migration
pnpm migration:generate
```

## Architecture

- **StorageService**: MinIO client wrapper, handles bucket management
- **ImageProcessorService**: Sharp-based image processing
- **EventService**: NATS event publishing
- **MediaService**: Orchestrates upload, processing, and storage
- **MediaController**: REST API endpoints

## Dependencies

- `minio` - MinIO client
- `sharp` - Image processing
- `multer` - File upload handling
- `nats` - NATS client for events
- `@nestjs/typeorm` - TypeORM integration
- `@nestjs/config` - Configuration management
