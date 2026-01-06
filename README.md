# Real Estate Portal: New Buildings in Armenia

## 0) Context Capsule

**Product Goal:** Build a "Norakaruyc-like" real-estate portal focused on new residential buildings in Armenia. Match core functionality (listings, map view, filters, building details, blog, mortgage calculator) with original design, text, and assets.

**Tech Stack:**
- Backend: NestJS (TypeScript), PostgreSQL + PostGIS, NATS JetStream, Meilisearch, Redis, MinIO
- Frontend: Nuxt 3 (TypeScript) SSR, Pinia, nuxt/i18n (AM/RU/EN), Leaflet
- Observability: OpenTelemetry (Prometheus/Grafana, Loki, Tempo/Jaeger)
- Security: Helmet/CORS, RBAC, audit logs, backups

**Non-Negotiables:**
- Database isolation: MVP uses schema-per-module pattern in ONE shared PostgreSQL instance (strict ownership, no cross-schema queries). Target architecture is microservices with DB-per-service.
- Contract-first APIs (OpenAPI) with versioning
- Eventing: Outbox pattern, idempotency, retries, DLQ
- SSR + SEO optimization required
- Multi-language support (AM/RU/EN)

**Architecture Decision:** [See Section 2 for recommendation]

**Key Services (Target):** API Gateway, Listings, Search, Media, Content, Analytics, Auth (optional)

**Open Questions:**
- ASSUMPTION: Initial traffic expectations moderate (<10K daily active users)
- ASSUMPTION: Team size: 2-4 backend, 1-2 frontend developers
- ASSUMPTION: Timeline: 3-4 months for MVP, 6-8 months for Phase 2

**Next Step:** Finalize architecture choice (Modular Monolith vs Microservices), then proceed with detailed service decomposition and data modeling.

---

## 1) Product Scope

### MVP (Minimum Viable Product)

**Core Features:**
- New buildings listing with filters (price range, area, location, developer, commissioning date), sorting (price, date, area), pagination
- Map view with building markers, clustering, and filter integration
- Currency toggle: AMD/USD with proper rounding (ASSUMPTION: exchange rate from Central Bank API or manual updates)
- Building detail page: address, price per m² range, "from price + area", last updated date, floors, commissioning date, developer contacts (phone/email), image gallery, external links (developer website, social media)
- Blog: list page with pagination, article detail pages with SEO metadata
- Mortgage calculator: loan amount, interest rate, term → monthly payment calculation
- "Add building" submission form: public form for users to suggest new buildings (moderated by admin)
- Favorites: anonymous local storage (localStorage) with optional migration to authenticated favorites later
- Basic analytics: track building views, contact click events (phone/email), call-to-action clicks

**Admin Panel (MVP):**
- CRUD operations for buildings (create, edit, delete, publish/unpublish)
- CRUD operations for blog articles
- Media management: upload images, process thumbnails, assign to buildings
- View analytics dashboard (basic aggregates: views, clicks per building)

### Phase 2 (Post-MVP)

**Enhanced Features:**
- User authentication (optional, for favorites sync across devices)
- Advanced filters: floor selection, parking availability, amenities (gym, pool, etc.)
- Saved searches with email notifications
- Comparison tool: compare up to 3-4 buildings side-by-side
- Developer profiles: dedicated pages for developers with their building portfolio
- Enhanced analytics: heatmaps, conversion funnels, user journey tracking
- Admin: bulk operations, import/export (CSV), advanced reporting, user management (if auth added)

### Non-Goals (Out of Scope)

- Secondary market listings (only new buildings)
- Commercial real estate (only residential)
- Real-time chat or messaging between users and developers
- Payment processing or booking systems
- Mobile native apps (web-first, responsive design)
- Social features (reviews, ratings, comments) - Phase 3 consideration
- Advanced AI/ML recommendations (Phase 3 consideration)

### Legal / IP Note

**IMPORTANT:** This project must use original design, text content, and media assets. Do not copy, reproduce, or derive from Norakaruyc's branding, visual identity, images, or written content. All assets must be created independently or sourced from properly licensed stock resources. This is a functional clone (matching features), not a visual or content clone.

---

## 2) Architecture Recommendation

### Option A: Modular Monolith First (Microservices-Ready)

**Description:**
Start with a single NestJS application organized into well-defined modules (Listings, Search, Media, Content, Analytics, Auth). Each module owns its database schema within ONE shared PostgreSQL instance with strict ownership rules (no cross-schema queries allowed). Use NATS JetStream for internal event communication between modules. Deploy as a single service initially, but structure code to allow extraction into microservices later.

**Pros:**
- Faster initial development (no service orchestration overhead)
- Easier local development and debugging (single codebase, single DB connection)
- Simpler deployment and CI/CD pipeline initially
- Lower infrastructure costs early (single container/process)
- Easier to maintain data consistency (ACID transactions across modules)
- Can refactor to microservices incrementally when needed

**Cons:**
- Risk of tight coupling if discipline is not maintained
- Single point of failure (if not properly load-balanced)
- Scaling requires scaling the entire monolith (cannot scale individual modules independently)
- Database becomes a bottleneck if not properly indexed and optimized
- Migration to microservices later requires significant refactoring effort

**Risks:**
- **Medium:** Module boundaries may blur over time → Mitigation: Enforce strict module boundaries, use NestJS module system rigorously, document service extraction plan
- **Low:** Database contention → Mitigation: Proper indexing, connection pooling, read replicas if needed
- **Medium:** Team may resist future microservices migration → Mitigation: Design with extraction in mind from day 1, use dependency injection, avoid direct DB access across modules

**Cost (Initial Setup):**
- Development: ~2-3 weeks for module structure + shared infrastructure
- Infrastructure: Single VPS/container (4-8GB RAM, 2-4 vCPU) sufficient for MVP
- Ongoing: Lower operational overhead, easier monitoring setup

### Option B: Microservices from Day 1

**Description:**
Deploy separate NestJS services from the start: API Gateway, Listings Service, Search Service, Media Service, Content Service, Analytics Service, optionally Auth Service. Each service has its own PostgreSQL database (DB-per-service architecture). Services communicate via NATS JetStream events and REST APIs. Requires service mesh or API Gateway for routing.

**Pros:**
- True independent scaling per service (e.g., scale Search service separately)
- Technology flexibility (can use different stacks per service if needed)
- Team autonomy (different teams can own different services)
- Fault isolation (one service failure doesn't bring down entire system)
- Aligns with long-term architecture vision from the start

**Cons:**
- Significantly higher development complexity (service discovery, distributed tracing, cross-service transactions)
- More complex local development (need to run 6-7 services + infrastructure)
- Higher infrastructure costs (multiple containers/processes, more DB instances)
- Distributed system challenges (eventual consistency, network failures, debugging across services)
- Over-engineering risk for MVP scale

**Risks:**
- **High:** Development velocity will be slower → Mitigation: Use mature tooling (Nx/Turborepo for monorepo, docker-compose for local)
- **High:** Distributed transaction complexity → Mitigation: Use outbox pattern, eventual consistency where acceptable
- **Medium:** Operational overhead (monitoring, logging, deployment) → Mitigation: Invest in observability tooling early
- **Medium:** Team may not have microservices experience → Mitigation: Training, documentation, pair programming

**Cost (Initial Setup):**
- Development: ~4-6 weeks for service scaffolding + inter-service communication + infrastructure setup
- Infrastructure: Multiple containers/VPS instances (minimum 2-3 services per instance, or separate instances for critical services)
- Ongoing: Higher operational overhead, more complex monitoring and debugging

### Recommendation: **Option A - Modular Monolith First**

**Justification:**

1. **Team Size & Timeline:** With a small team (2-4 backend devs) and a 3-4 month MVP timeline, a modular monolith allows faster iteration and fewer coordination overheads. Microservices would require significant upfront investment in infrastructure and cross-cutting concerns.

2. **Traffic Expectations:** For MVP scale (<10K daily active users), a well-structured monolith can handle the load efficiently. Premature optimization (microservices) adds complexity without immediate benefit.

3. **Risk Mitigation:** The modular monolith approach reduces risk of over-engineering while maintaining a clear path to microservices. If traffic grows or team expands, services can be extracted incrementally.

4. **Cost Efficiency:** Lower initial infrastructure and operational costs allow focus on feature development rather than distributed systems complexity.

5. **Maintainability Focus:** The requirement emphasizes "correctness and long-term maintainability." A modular monolith with clear boundaries is easier to maintain initially, and the extraction path is well-documented.

**Migration Path to Microservices (North Star):**

When to consider extraction:
- Traffic exceeds 50K+ daily active users
- Team grows to 8+ backend developers
- Specific services need independent scaling (e.g., Search service under heavy load)
- Need for technology diversity (e.g., Python service for ML features)

Extraction strategy:
1. Start with stateless services (Search, Media) - easier to extract
2. Extract read-heavy services next (Content, Analytics)
3. Finally extract write-heavy services (Listings) with careful transaction boundary planning
4. Maintain API Gateway pattern throughout to abstract service boundaries from clients

**Target Microservices Design (North Star):**

Even though starting with a monolith, the codebase will be structured to align with this target architecture:

- **API Gateway / BFF:** Single entry point, routing, rate limiting, authentication
- **Listings Service:** Buildings, developers, regions, pricing snapshots
- **Search Service:** Meilisearch sync, query handling, search analytics
- **Media Service:** MinIO operations, image processing (sharp worker), CDN integration
- **Content Service:** Blog articles, static pages, SEO metadata
- **Analytics Service:** Event ingestion, aggregation, reporting
- **Auth Service (Optional):** OIDC/JWT, user management, RBAC for admin

Each service will have:
- Own PostgreSQL database (MVP: schema-per-module in ONE shared Postgres instance with strict ownership; Target: DB-per-service with separate database instances)
- Defined REST API contracts (OpenAPI specs)
- Event producers/consumers (NATS JetStream topics)
- Independent deployment capability (Docker containers, Kubernetes pods)

---

## 3) Target Microservices Decomposition

### Service Overview

The target architecture consists of 6-7 services (with Auth as optional). In the modular monolith phase, these will be implemented as NestJS modules with clear boundaries, ready for extraction.

### 3.1 API Gateway / BFF (Backend for Frontend)

**Responsibilities:**
- Single entry point for all client requests (public and admin)
- Request routing to appropriate backend services
- Rate limiting (per IP, per user if authenticated)
- Authentication/authorization enforcement (JWT validation, RBAC checks)
- Request/response transformation and aggregation
- CORS handling
- API versioning (path-based: `/v1/`, `/v2/`)
- Health check aggregation from downstream services

**Owned DB Schema:**
- `gateway.rate_limit_buckets` (Redis-backed, but schema for audit)
- `gateway.api_keys` (for admin/service-to-service auth)
- `gateway.audit_logs` (request logs, security events)

**Key REST Endpoints:**
```
GET    /v1/buildings                    → Proxy to Listings Service
GET    /v1/buildings/:id                → Proxy to Listings Service
GET    /v1/search/buildings             → Proxy to Search Service
GET    /v1/blog/articles                → Proxy to Content Service
GET    /v1/blog/articles/:slug          → Proxy to Content Service
POST   /v1/buildings/submit             → Proxy to Listings Service
GET    /v1/media/:id                    → Proxy to Media Service
POST   /v1/admin/buildings              → Auth check → Proxy to Listings Service
GET    /v1/admin/analytics/dashboard    → Auth check → Aggregate from Analytics Service
```

**Events Produced:**
- `gateway.request.received` (for analytics, optional)
- `gateway.security.violation` (rate limit exceeded, unauthorized access)

**Events Consumed:**
- None (acts as entry point, doesn't consume business events)

---

### 3.2 Listings Service

**Responsibilities:**
- CRUD operations for buildings, developers, regions
- Building submission form processing (moderation workflow)
- Pricing snapshot management (historical price tracking)
- Building-to-developer relationships
- Building-to-region relationships
- Filtering and sorting logic (before passing to Search Service for full-text)
- Currency conversion (AMD/USD) with rounding rules
- Favorites management (if authenticated; anonymous handled client-side)
- PostGIS geospatial data ownership (location coordinates, spatial indexes)

**Owned DB Schema:**
- `listings.buildings` (main table with PostGIS geometry - owned by Listings Service only)
- `listings.developers`
- `listings.regions` (administrative regions, districts)
- `listings.pricing_snapshots` (historical pricing data)
- `listings.building_images` (references to Media Service assets)
- `listings.building_submissions` (user-submitted building suggestions)
- `listings.favorites` (if auth enabled)

**Key REST Endpoints:**
```
GET    /v1/buildings                    → List with filters, pagination
GET    /v1/buildings/:id                → Building detail
GET    /v1/buildings/:id/pricing        → Current + historical pricing
GET    /v1/developers                   → List developers
GET    /v1/developers/:id               → Developer detail with buildings
GET    /v1/regions                      → List regions (for filters)
POST   /v1/buildings/submit             → Public submission form
GET    /v1/admin/buildings              → Admin list (with unpublished)
POST   /v1/admin/buildings              → Create building
PUT    /v1/admin/buildings/:id          → Update building
DELETE /v1/admin/buildings/:id          → Delete building
POST   /v1/admin/buildings/:id/publish  → Publish/unpublish
```

**Events Produced:**
- `listings.building.created` (payload: `{ buildingId, developerId, regionId, status: 'draft' }`)
- `listings.building.updated` (payload: `{ buildingId, changes: {...}, updatedAt }`)
- `listings.building.published` (payload: `{ buildingId, publishedAt }`)
- `listings.building.deleted` (payload: `{ buildingId, deletedAt }`)
- `listings.pricing.updated` (payload: `{ buildingId, pricePerM2Min, pricePerM2Max, currency, snapshotId }`)
- `listings.developer.created` (payload: `{ developerId, name, contacts }`)

**Events Consumed:**
- `media.image.processed` → Update building image references
- `analytics.building.viewed` → Optional: update view count cache

---

### 3.3 Search Service

**Responsibilities:**
- Meilisearch index management (sync from Listings Service events)
- Full-text search queries (buildings, developers)
- Search result ranking and relevance tuning
- Search analytics (popular queries, zero-result queries)
- Geospatial search for map bounds queries (uses Search-owned read-model `search.building_locations` populated via events from Listings Service)
- Faceted search (filters: price, area, region, developer)

**Service Boundary Rules:**
- **MUST NOT** query `listings.*` schema directly (strict database isolation)
- **MUST** use event-driven read-model (`search.building_locations`) for all geospatial queries
- **MUST** populate read-model by consuming `listings.building.*` events
- All map bounds queries handled via `search.building_locations` table using PostGIS

**Owned DB Schema:**
- `search.search_analytics` (query logs, result counts, zero-result tracking)
- `search.index_sync_status` (last sync timestamp, sync errors)
- `search.building_locations` (read-model for geospatial queries: building_id, location PostGIS geometry, synced via events from Listings Service)

**Key REST Endpoints:**
```
GET    /v1/search/buildings             → Full-text + faceted search
GET    /v1/search/buildings/map         → Geospatial search (bounding box)
GET    /v1/search/developers            → Developer search
POST   /v1/admin/search/reindex         → Manual reindex trigger
GET    /v1/admin/search/analytics       → Search analytics dashboard
```

**Events Produced:**
- `search.index.synced` (payload: `{ entityType: 'building', entityId, status: 'success|error' }`)
- `search.query.executed` (payload: `{ query, filters, resultCount, executionTimeMs }`)

**Events Consumed:**
- `listings.building.created` → Add to Meilisearch index
- `listings.building.updated` → Update Meilisearch index
- `listings.building.deleted` → Remove from Meilisearch index
- `listings.building.published` → Update index (change visibility)
- `listings.pricing.updated` → Update price facets in index

**Meilisearch Index Structure:**
```json
{
  "buildingId": "uuid",
  "title": { "am": "Նոր Բնակարանային Համալիր", "ru": "Новый Жилой Комплекс", "en": "New Residential Complex" },
  "address": { "am": "Երևան, Արաբկիր", "ru": "Ереван, Арабкир", "en": "Yerevan, Arabkir" },
  "description": { "am": "Նորակառույց բնակարանային համալիր", "ru": "Новостройка жилой комплекс", "en": "New construction residential complex" },
  "pricePerM2Min": 500000,
  "pricePerM2Max": 800000,
  "areaMin": 45,
  "areaMax": 120,
  "floors": 10,
  "commissioningDate": "2025-12-31",
  "developerId": "uuid",
  "developerName": { "am": "Դեվելոպեր ՍՊԸ", "ru": "Застройщик ООО", "en": "Developer LLC" },
  "regionId": "uuid",
  "regionName": { "am": "Արաբկիր", "ru": "Арабкир", "en": "Arabkir" },
  "location": { "lat": 40.1811, "lng": 44.5144 },
  "status": "published",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

### 3.4 Media Service

**Responsibilities:**
- File upload handling (images, documents)
- MinIO S3-compatible storage operations
- Image processing (resize, thumbnail generation, format conversion) via worker
- CDN integration (optional, for Phase 2)
- Media metadata management (alt text, captions, dimensions)
- Media access control (public vs. admin-only)

**Owned DB Schema:**
- `media.assets` (file metadata, MinIO bucket/key, processing status)
- `media.processing_jobs` (queue status, retry count, errors)

**Key REST Endpoints:**
```
POST   /v1/media/upload                 → Upload file (multipart/form-data)
GET    /v1/media/:id                    → Get media metadata + signed URL
GET    /v1/media/:id/thumbnail          → Get thumbnail (processed)
DELETE /v1/media/:id                    → Delete media
GET    /v1/admin/media                  → List all media (admin)
POST   /v1/admin/media/:id/process      → Trigger reprocessing
```

**Events Produced:**
- `media.uploaded` (payload: `{ mediaId, originalFilename, mimeType, size, bucket, key }`)
- `media.image.processed` (payload: `{ mediaId, thumbnailUrl, variants: [{ size, url }] }`)
- `media.processing.failed` (payload: `{ mediaId, error, retryCount }`)

**Events Consumed:**
- None (triggered by HTTP uploads, processes asynchronously)

**Image Processing Worker:**
- Separate process/container using Sharp library
- Listens to `media.uploaded` events
- Generates thumbnails: `150x150`, `300x300`, `800x800`, `1200x1200`
- Stores variants in MinIO, updates `media.assets` table
- Publishes `media.image.processed` when complete

---

### 3.5 Content Service

**Responsibilities:**
- Blog article CRUD operations
- Static page management (About, Terms, Privacy Policy)
- SEO metadata management (meta tags, Open Graph, structured data)
- Content versioning (draft/published states)
- Multi-language content (AM/RU/EN) for articles and pages
- Content search (full-text within blog)

**Owned DB Schema:**
- `content.articles` (blog posts)
- `content.pages` (static pages)
- `content.article_translations` (multi-language content)
- `content.page_translations` (multi-language content)
- `content.seo_metadata` (reusable SEO templates)

**Key REST Endpoints:**
```
GET    /v1/blog/articles                → List articles (published only, paginated)
GET    /v1/blog/articles/:slug          → Article detail by slug
GET    /v1/pages/:slug                  → Static page by slug
GET    /v1/admin/blog/articles          → Admin list (includes drafts)
POST   /v1/admin/blog/articles          → Create article
PUT    /v1/admin/blog/articles/:id      → Update article
DELETE /v1/admin/blog/articles/:id      → Delete article
POST   /v1/admin/blog/articles/:id/publish → Publish/unpublish
```

**Events Produced:**
- `content.article.created` (payload: `{ articleId, slug, status: 'draft', authorId }`)
- `content.article.published` (payload: `{ articleId, slug, publishedAt, seoMetadata }`)
- `content.article.updated` (payload: `{ articleId, slug, updatedAt }`)

**Events Consumed:**
- None (read-heavy service, minimal event dependencies)

**Alternative: Headless CMS Integration (Phase 2 Consideration)**
- If content management becomes complex, consider integrating Strapi or Payload CMS
- Content Service would become a proxy/adapter to CMS API
- Maintains same REST contract, abstracts CMS implementation

---

### 3.6 Analytics Service

**Responsibilities:**
- Event ingestion (building views, contact clicks, call-to-action clicks)
- Event aggregation (hourly/daily/weekly aggregates)
- Analytics dashboard data (views per building, popular buildings, conversion metrics)
- Export capabilities (CSV, JSON for reporting)
- Privacy compliance (GDPR considerations: anonymization, data retention)

**Owned DB Schema:**
- `analytics.events` (raw event log, partitioned by date)
- `analytics.aggregates` (pre-computed aggregates: building views, clicks by date)
- `analytics.sessions` (optional: user session tracking if auth enabled)

**Key REST Endpoints:**
```
POST   /v1/analytics/events              → Ingest event (public, rate-limited)
GET    /v1/admin/analytics/dashboard     → Dashboard data (aggregates)
GET    /v1/admin/analytics/buildings/:id → Building-specific analytics
GET    /v1/admin/analytics/export        → Export data (CSV/JSON)
```

**Events Produced:**
- `analytics.event.ingested` (payload: `{ eventType, entityId, timestamp, metadata }`)
- `analytics.aggregate.computed` (payload: `{ period: 'daily', entityId, metric, value }`)

**Events Consumed:**
- `listings.building.viewed` (from frontend tracking)
- `listings.contact.clicked` (from frontend tracking)
- `listings.cta.clicked` (call-to-action clicks)

**Event Types:**
```typescript
type AnalyticsEvent = 
  | { type: 'building.viewed', buildingId: string, sessionId?: string }
  | { type: 'contact.clicked', buildingId: string, contactType: 'phone' | 'email', sessionId?: string }
  | { type: 'cta.clicked', buildingId: string, ctaType: string, sessionId?: string }
  | { type: 'search.executed', query: string, resultCount: number, filters: object }
  | { type: 'favorite.added', buildingId: string, sessionId?: string }
```

---

### 3.7 Auth Service (Optional, Phase 2)

**Responsibilities:**
- User registration and authentication (OIDC/JWT)
- Password management (hashing, reset flows)
- JWT token generation and validation
- RBAC for admin users (roles: super_admin, admin, moderator)
- Session management (optional: refresh tokens)
- OAuth integration (optional: Google, Facebook login)

**Owned DB Schema:**
- `auth.users` (user accounts)
- `auth.roles` (RBAC roles)
- `auth.user_roles` (user-role assignments)
- `auth.permissions` (fine-grained permissions)
- `auth.sessions` (active sessions, if session-based)

**Key REST Endpoints:**
```
POST   /v1/auth/register                → User registration
POST   /v1/auth/login                   → Login (JWT response)
POST   /v1/auth/refresh                 → Refresh token
POST   /v1/auth/logout                  → Invalidate token
GET    /v1/auth/me                      → Current user profile
POST   /v1/admin/users                  → Create admin user
GET    /v1/admin/users                  → List users (admin)
PUT    /v1/admin/users/:id/roles        → Assign roles
```

**Events Produced:**
- `auth.user.registered` (payload: `{ userId, email, role: 'user' }`)
- `auth.user.role.assigned` (payload: `{ userId, role, assignedBy }`)

**Events Consumed:**
- None (auth is mostly independent, but other services validate JWT via Gateway)

**Integration Notes:**
- Gateway validates JWT tokens (can cache public keys from Auth Service)
- Admin endpoints require `admin` or `super_admin` role
- Favorites service (if extracted) would consume `auth.user.registered` to migrate anonymous favorites

---

### Service Communication Summary

**Synchronous (REST):**
- Client → Gateway → Services (all public/admin requests)
- Gateway → Services (internal REST calls, can use service discovery in microservices)

**Asynchronous (NATS JetStream Events):**
- Listings → Search (building CRUD events for index sync)
- Listings → Analytics (optional: building updates for analytics)
- Media → Listings (image processed events)
- Frontend → Analytics (event ingestion via REST, then events for aggregation)

**Event Flow Example: Building Creation**
1. Admin creates building via Gateway → Listings Service
2. Listings Service saves to DB, publishes `listings.building.created`
3. Search Service consumes event, adds to Meilisearch index
4. Media Service (if images uploaded) publishes `media.image.processed`
5. Listings Service updates building with image references

---

## 4) Data Model

### 4.1 Entity Relationship Overview

**Core Entities:**
- `Building` (central entity)
- `Developer` (building owner/developer)
- `Region` (administrative regions/districts)
- `PricingSnapshot` (historical pricing)
- `Article` (blog content)
- `MediaAsset` (images/files)
- `AnalyticsEvent` (tracking data)

**Relationships:**
- Building → Developer (many-to-one)
- Building → Region (many-to-one)
- Building → PricingSnapshot (one-to-many, time-series)
- Building → MediaAsset (many-to-many via junction table)
- Building → Article (optional: featured articles, many-to-many)

### 4.2 Database Schema (PostgreSQL + PostGIS)

**Note:** Database schema design applies to both **(MVP)** (schema-per-module in ONE shared Postgres instance) and **(Target)** (DB-per-service with separate database instances). Schema ownership and isolation rules are enforced in both cases.

#### 4.2.1 Listings Service Schema

**`listings.buildings`**
```sql
CREATE TABLE listings.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Multi-language fields (JSONB for flexibility, or separate translation table)
  title JSONB NOT NULL, -- {"am": "Նոր Բնակարանային Համալիր", "ru": "Новый Жилой Комплекс", "en": "New Residential Complex"}
  description JSONB,
  address JSONB NOT NULL,
  
  -- Location (PostGIS)
  location GEOGRAPHY(POINT, 4326) NOT NULL, -- WGS84 lat/lng
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL DEFAULT 'Yerevan',
  postal_code VARCHAR(20),
  
  -- Building attributes
  floors INTEGER NOT NULL CHECK (floors > 0),
  total_units INTEGER, -- Total apartments in building
  commissioning_date DATE, -- When building will be ready
  construction_status VARCHAR(50) CHECK (construction_status IN ('planned', 'under_construction', 'completed')),
  
  -- Pricing (current, denormalized for performance)
  price_per_m2_min DECIMAL(12, 2), -- AMD
  price_per_m2_max DECIMAL(12, 2), -- AMD
  area_min DECIMAL(8, 2) NOT NULL CHECK (area_min > 0), -- m²
  area_max DECIMAL(8, 2) NOT NULL CHECK (area_max >= area_min), -- m²
  currency VARCHAR(3) NOT NULL DEFAULT 'AMD',
  
  -- Relationships
  developer_id UUID NOT NULL REFERENCES listings.developers(id) ON DELETE RESTRICT,
  region_id UUID NOT NULL REFERENCES listings.regions(id) ON DELETE RESTRICT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- External links
  developer_website_url VARCHAR(500),
  developer_facebook_url VARCHAR(500),
  developer_instagram_url VARCHAR(500),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_by UUID, -- Admin user ID (if auth enabled)
  
  -- Full-text search vector (optional, if not using Meilisearch)
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('armenian', COALESCE(title->>'am', '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(title->>'ru', '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(title->>'en', '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(address->>'am', '')), 'C')
  ) STORED
);

-- PostGIS spatial index
CREATE INDEX idx_buildings_location ON listings.buildings USING GIST(location);

-- Common query indexes
CREATE INDEX idx_buildings_status ON listings.buildings(status) WHERE status = 'published';
CREATE INDEX idx_buildings_developer ON listings.buildings(developer_id);
CREATE INDEX idx_buildings_region ON listings.buildings(region_id);
CREATE INDEX idx_buildings_commissioning_date ON listings.buildings(commissioning_date) WHERE commissioning_date IS NOT NULL;
CREATE INDEX idx_buildings_price_range ON listings.buildings(price_per_m2_min, price_per_m2_max) WHERE status = 'published';
CREATE INDEX idx_buildings_area_range ON listings.buildings(area_min, area_max) WHERE status = 'published';
CREATE INDEX idx_buildings_updated_at ON listings.buildings(updated_at DESC) WHERE status = 'published';
CREATE INDEX idx_buildings_featured ON listings.buildings(is_featured) WHERE is_featured = TRUE AND status = 'published';

-- Full-text search index (if using PostgreSQL FTS as fallback)
CREATE INDEX idx_buildings_search_vector ON listings.buildings USING GIN(search_vector);

-- Composite index for common filter combinations
CREATE INDEX idx_buildings_status_region_price ON listings.buildings(status, region_id, price_per_m2_min) WHERE status = 'published';
```

**`listings.developers`**
```sql
CREATE TABLE listings.developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL, -- {"am": "Դեվելոպեր ՍՊԸ", "ru": "Застройщик ООО", "en": "Developer LLC"}
  description JSONB,
  logo_media_id UUID, -- Reference to media.assets
  website_url VARCHAR(500),
  email VARCHAR(255),
  phone VARCHAR(50),
  address JSONB,
  established_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_developers_name ON listings.developers USING GIN(name);
```

**`listings.regions`**
```sql
CREATE TABLE listings.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL, -- {"am": "Արաբկիր", "ru": "Арабкир", "en": "Arabkir"}
  parent_region_id UUID REFERENCES listings.regions(id), -- For hierarchical regions (e.g., district → city)
  region_type VARCHAR(50) NOT NULL CHECK (region_type IN ('city', 'district', 'neighborhood')),
  boundary GEOGRAPHY(POLYGON, 4326), -- Optional: region boundary for map clustering
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regions_parent ON listings.regions(parent_region_id);
CREATE INDEX idx_regions_boundary ON listings.regions USING GIST(boundary) WHERE boundary IS NOT NULL;
```

**`listings.pricing_snapshots`**
```sql
CREATE TABLE listings.pricing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES listings.buildings(id) ON DELETE CASCADE,
  price_per_m2_min DECIMAL(12, 2) NOT NULL,
  price_per_m2_max DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'AMD',
  area_min DECIMAL(8, 2),
  area_max DECIMAL(8, 2),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(building_id, snapshot_date)
);

-- Index for historical price queries
CREATE INDEX idx_pricing_snapshots_building_date ON listings.pricing_snapshots(building_id, snapshot_date DESC);
CREATE INDEX idx_pricing_snapshots_date ON listings.pricing_snapshots(snapshot_date DESC);
```

**`listings.building_images`** (Junction table)
```sql
CREATE TABLE listings.building_images (
  building_id UUID NOT NULL REFERENCES listings.buildings(id) ON DELETE CASCADE,
  media_id UUID NOT NULL, -- Reference to media.assets (cross-schema, handled in application)
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (building_id, media_id)
);

CREATE INDEX idx_building_images_order ON listings.building_images(building_id, display_order);
CREATE UNIQUE INDEX idx_building_images_primary ON listings.building_images(building_id) WHERE is_primary = TRUE;
```

**`listings.building_submissions`**
```sql
CREATE TABLE listings.building_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Submitted data (similar to buildings table, but unvalidated)
  title JSONB,
  address JSONB,
  location GEOGRAPHY(POINT, 4326),
  developer_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  converted_to_building_id UUID REFERENCES listings.buildings(id), -- If admin creates building from submission
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID -- Admin user ID
);

CREATE INDEX idx_submissions_status ON listings.building_submissions(status) WHERE status = 'pending';
```

---

#### 4.2.2 Media Service Schema

**`media.assets`**
```sql
CREATE TABLE media.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL, -- bytes
  bucket VARCHAR(100) NOT NULL, -- MinIO bucket name
  object_key VARCHAR(500) NOT NULL, -- MinIO object key (path)
  width INTEGER, -- For images
  height INTEGER, -- For images
  alt_text JSONB, -- {"am": "Նկարի նկարագրություն", "ru": "Описание изображения", "en": "Image description"}
  caption JSONB,
  processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  variants JSONB, -- {"thumbnail": "https://cdn.example.com/thumb.jpg", "small": "https://cdn.example.com/small.jpg", "medium": "https://cdn.example.com/medium.jpg", "large": "https://cdn.example.com/large.jpg"} URLs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bucket, object_key)
);

CREATE INDEX idx_assets_processing_status ON media.assets(processing_status) WHERE processing_status IN ('pending', 'processing');
CREATE INDEX idx_assets_mime_type ON media.assets(mime_type);
```

**`media.processing_jobs`**
```sql
CREATE TABLE media.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media.assets(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL, -- 'thumbnail', 'resize', 'format_conversion'
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processing_jobs_status ON media.processing_jobs(status) WHERE status IN ('queued', 'processing');
```

---

#### 4.2.3 Content Service Schema

**`content.articles`**
```sql
CREATE TABLE content.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  title JSONB NOT NULL,
  excerpt JSONB,
  body JSONB NOT NULL, -- Full article content (markdown or HTML)
  featured_image_media_id UUID,
  author_id UUID, -- Admin user ID
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_articles_status ON content.articles(status) WHERE status = 'published';
CREATE INDEX idx_articles_slug ON content.articles(slug);
CREATE INDEX idx_articles_published_at ON content.articles(published_at DESC) WHERE status = 'published';
```

**`content.seo_metadata`**
```sql
CREATE TABLE content.seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'article', 'building', 'page'
  entity_id UUID NOT NULL,
  meta_title JSONB,
  meta_description JSONB,
  og_title JSONB,
  og_description JSONB,
  og_image_media_id UUID,
  canonical_url VARCHAR(500),
  structured_data JSONB, -- JSON-LD structured data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_seo_metadata_entity ON content.seo_metadata(entity_type, entity_id);
```

---

#### 4.2.4 Analytics Service Schema

**`analytics.events`** (Partitioned by date for performance)
```sql
-- Main table (parent)
CREATE TABLE analytics.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50), -- 'building', 'article', 'developer'
  entity_id UUID,
  session_id VARCHAR(100), -- Anonymous session ID or user ID
  metadata JSONB, -- Flexible event-specific data
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partition for current month (example)
CREATE TABLE analytics.events_2024_01 PARTITION OF analytics.events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes on partition
CREATE INDEX idx_events_type_entity ON analytics.events_2024_01(event_type, entity_type, entity_id);
CREATE INDEX idx_events_created_at ON analytics.events_2024_01(created_at DESC);
CREATE INDEX idx_events_session ON analytics.events_2024_01(session_id) WHERE session_id IS NOT NULL;
```

**`analytics.aggregates`**
```sql
CREATE TABLE analytics.aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL, -- 'building_views', 'contact_clicks', 'cta_clicks'
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  value BIGINT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_name, entity_type, entity_id, period_type, period_start)
);

CREATE INDEX idx_aggregates_entity ON analytics.aggregates(entity_type, entity_id, period_type, period_start DESC);
CREATE INDEX idx_aggregates_metric ON analytics.aggregates(metric_name, period_type, period_start DESC);
```

---

### 4.3 Indexing Strategy

**PostGIS Spatial Indexes:**
- `buildings.location` → GIST index for bounding box queries, distance queries
- `regions.boundary` → GIST index for point-in-polygon queries

**Composite Indexes for Common Queries:**
- `(status, region_id, price_per_m2_min)` → Filter by region + price range on published buildings
- `(status, commissioning_date)` → Filter by commissioning date
- `(status, updated_at DESC)` → Recent buildings listing

**Full-Text Search:**
- Primary: Meilisearch (handled by Search Service)
- Fallback: PostgreSQL TSVECTOR on `buildings.search_vector` (if Meilisearch unavailable)

**Time-Series Optimization:**
- `pricing_snapshots` → Indexed by `(building_id, snapshot_date DESC)` for historical queries
- `analytics.events` → Partitioned by date, indexes on `(event_type, entity_id, created_at)`

---

### 4.4 Pricing Snapshots Approach

**Purpose:** Track historical price changes for buildings (useful for analytics, price trends).

**Strategy:**
1. **Automatic Snapshots:** When building price is updated, create a snapshot if price changed significantly (ASSUMPTION: >5% change threshold) or on scheduled basis (daily/weekly).
2. **Manual Snapshots:** Admin can create snapshots manually.
3. **Retention:** Keep snapshots for 2 years (ASSUMPTION), archive older data.

**Implementation:**
- Trigger or application logic on `buildings.price_per_m2_min/max` update
- Compare with latest snapshot, create new snapshot if threshold met
- Query pattern: `SELECT * FROM pricing_snapshots WHERE building_id = ? ORDER BY snapshot_date DESC LIMIT 30`

---

### 4.5 Multi-Language Fields Strategy

**Approach: JSONB Columns**

**Rationale:**
- Flexible: Easy to add new languages without schema changes
- Single query: No JOINs needed for translations
- PostgreSQL JSONB indexing: Can index specific language paths
- Trade-off: Less normalized, but acceptable for content that's always accessed together

**Alternative Considered:** Separate translation tables
- Pros: More normalized, easier to query single language
- Cons: Requires JOINs, more complex queries, harder to add languages

**JSONB Structure:**
```json
{
  "am": "Նորակառույց բնակարան Երևանում",
  "ru": "Новостройка в Ереване",
  "en": "New building in Yerevan"
}
```

**Indexing JSONB:**
```sql
-- Index specific language (if needed for filtering)
CREATE INDEX idx_buildings_title_am ON listings.buildings USING GIN((title->'am'));
CREATE INDEX idx_buildings_title_ru ON listings.buildings USING GIN((title->'ru'));
```

**Query Pattern:**
```sql
-- Get title in specific language (with fallback)
SELECT 
  COALESCE(title->>'am', title->>'ru', title->>'en') as title,
  address,
  price_per_m2_min,
  price_per_m2_max
FROM listings.buildings
WHERE status = 'published';
```

**Application Layer:** Use i18n library to select appropriate language based on user locale, fallback chain: AM → RU → EN.

---

### 4.6 Data Migration & Seeding Strategy

**Initial Seed Data:**
- Regions: Pre-populate with Armenian administrative regions (Yerevan districts, major cities)
- Developers: Seed with known developers (if data available)
- Sample buildings: 10-20 sample buildings for development/testing

**Migration Tool:** Use NestJS TypeORM migrations (native NestJS integration, supports PostGIS).

**Seed Scripts:**
- `npm run seed:regions` → Load regions from JSON/CSV
- `npm run seed:developers` → Load developers
- `npm run seed:buildings` → Load sample buildings
- `npm run seed:all` → Run all seeds

---

## 5) API Contracts (REST)

### 5.1 API Versioning Strategy

**Approach: Path-Based Versioning**

- Base URL: `https://api.example.com/v1/` (production)
- Version in path: `/v1/`, `/v2/`, etc.
- **ASSUMPTION:** Maintain at least 2 versions simultaneously during transitions (6-month deprecation window)
- Version header alternative: `X-API-Version: v1` (optional, for testing)

**Versioning Rules:**
- Breaking changes → New version (e.g., `/v2/`)
- Non-breaking additions → Same version (new optional fields, new endpoints)
- Deprecation: Mark endpoints with `Deprecated` header, document sunset date
- Client libraries: Generate from OpenAPI specs per version

---

### 5.2 Public Endpoints

#### 5.2.1 Buildings

**`GET /v1/buildings`**
- **Description:** List buildings with filters, sorting, pagination
- **Query Parameters:**
  - `page` (integer, default: 1, min: 1)
  - `limit` (integer, default: 20, min: 1, max: 100)
  - `sort` (string, enum: `price_asc`, `price_desc`, `date_desc`, `date_asc`, `area_asc`, `area_desc`, default: `date_desc`)
  - `currency` (string, enum: `AMD`, `USD`, default: `AMD`)
  - `price_min` (number, optional, in selected currency)
  - `price_max` (number, optional, in selected currency)
  - `area_min` (number, optional, m²)
  - `area_max` (number, optional, m²)
  - `region_id` (UUID, optional)
  - `developer_id` (UUID, optional)
  - `commissioning_date_from` (date, ISO 8601, optional)
  - `commissioning_date_to` (date, ISO 8601, optional)
  - `floors_min` (integer, optional)
  - `floors_max` (integer, optional)
  - `status` (string, enum: `published`, default: `published` - only published for public)
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": { "am": "Նոր Բնակարանային Համալիր", "ru": "Новый Жилой Комплекс", "en": "New Residential Complex" },
      "address": { "am": "Երևան, Արաբկիր", "ru": "Ереван, Арабкир", "en": "Yerevan, Arabkir" },
      "location": { "lat": 40.1811, "lng": 44.5144 },
      "pricePerM2Min": 500000,
      "pricePerM2Max": 800000,
      "areaMin": 45,
      "areaMax": 120,
      "floors": 10,
      "commissioningDate": "2025-12-31",
      "developer": { "id": "uuid", "name": { "am": "Դեվելոպեր ՍՊԸ", "ru": "Застройщик ООО", "en": "Developer LLC" } },
      "region": { "id": "uuid", "name": { "am": "Արաբկիր", "ru": "Арабкир", "en": "Arabkir" } },
      "primaryImage": { "id": "uuid", "thumbnailUrl": "https://cdn.example.com/buildings/thumb.jpg" },
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "meta": {
    "currency": "AMD",
    "exchangeRate": 1.0,
    "sort": "date_desc"
  }
}
```

**`GET /v1/buildings/:id`**
- **Description:** Get building detail by ID
- **Path Parameters:**
  - `id` (UUID, required)
- **Query Parameters:**
  - `currency` (string, enum: `AMD`, `USD`, default: `AMD`)
- **Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": { "am": "Նոր Բնակարանային Համալիր", "ru": "Новый Жилой Комплекс", "en": "New Residential Complex" },
    "description": { "am": "Նորակառույց բնակարանային համալիր Երևանում", "ru": "Новостройка жилой комплекс в Ереване", "en": "New construction residential complex in Yerevan" },
    "address": { "am": "Երևան, Արաբկիր", "ru": "Ереван, Арабкир", "en": "Yerevan, Arabkir" },
    "location": { "lat": 40.1811, "lng": 44.5144 },
    "addressLine1": "Street 1",
    "addressLine2": "Building 5",
    "city": "Yerevan",
    "postalCode": "0001",
    "pricePerM2Min": 500000,
    "pricePerM2Max": 800000,
    "areaMin": 45,
    "areaMax": 120,
    "floors": 10,
    "totalUnits": 120,
    "commissioningDate": "2025-12-31",
    "constructionStatus": "under_construction",
    "currency": "AMD",
    "developer": {
      "id": "uuid",
      "name": { "am": "Դեվելոպեր ՍՊԸ", "ru": "Застройщик ООО", "en": "Developer LLC" },
      "description": { "am": "Վստահելի դեվելոպեր", "ru": "Надежный застройщик", "en": "Reliable developer" },
      "email": "developer@example.com",
      "phone": "+374 10 123456",
      "websiteUrl": "https://developer.com",
      "logo": { "id": "uuid", "url": "https://cdn.example.com/logos/developer.jpg" }
    },
    "region": {
      "id": "uuid",
      "name": { "am": "Արաբկիր", "ru": "Арабкир", "en": "Arabkir" },
      "regionType": "district"
    },
    "images": [
      {
        "id": "uuid",
        "url": "https://cdn.example.com/buildings/image.jpg",
        "thumbnailUrl": "https://cdn.example.com/buildings/thumb.jpg",
        "displayOrder": 0,
        "isPrimary": true,
        "altText": { "am": "Նորակառույց համալիրի լուսանկար", "ru": "Фото новостройки", "en": "New building complex photo" }
      }
    ],
    "externalLinks": {
      "developerWebsite": "https://developer.com",
      "facebook": "https://facebook.com/developer",
      "instagram": "https://instagram.com/developer"
    },
    "pricingHistory": [
      {
        "snapshotDate": "2024-01-01",
        "pricePerM2Min": 480000,
        "pricePerM2Max": 750000,
        "currency": "AMD"
      }
    ],
    "status": "published",
    "isFeatured": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "publishedAt": "2024-01-10T08:00:00Z"
  }
}
```

**`GET /v1/buildings/:id/pricing`**
- **Description:** Get current and historical pricing for a building
- **Query Parameters:**
  - `currency` (string, enum: `AMD`, `USD`, default: `AMD`)
  - `limit` (integer, default: 30, max: 100) - number of historical snapshots
- **Response:**
```json
{
  "data": {
    "buildingId": "uuid",
    "current": {
      "pricePerM2Min": 500000,
      "pricePerM2Max": 800000,
      "currency": "AMD",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    "history": [
      {
        "snapshotDate": "2024-01-15",
        "pricePerM2Min": 500000,
        "pricePerM2Max": 800000,
        "currency": "AMD"
      },
      {
        "snapshotDate": "2024-01-01",
        "pricePerM2Min": 480000,
        "pricePerM2Max": 750000,
        "currency": "AMD"
      }
    ]
  }
}
```

**`POST /v1/buildings/submit`**
- **Description:** Public form to submit a new building suggestion
- **Request Body:**
```json
{
  "title": { "am": "Նոր Բնակարանային Համալիր", "ru": "Новый Жилой Комплекс", "en": "New Residential Complex" },
  "address": { "am": "Երևան, Արաբկիր", "ru": "Ереван, Арабкир", "en": "Yerevan, Arabkir" },
  "location": { "lat": 40.1811, "lng": 44.5144 },
  "developerName": "Developer Name",
  "contactEmail": "submitter@example.com",
  "contactPhone": "+374 10 123456",
  "notes": "Additional information about the building"
}
```
- **Response:**
```json
{
  "data": {
    "submissionId": "uuid",
    "status": "pending",
    "message": "Thank you for your submission. We will review it shortly."
  }
}
```
- **Rate Limiting:** 5 submissions per IP per hour (ASSUMPTION)

---

#### 5.2.2 Search

**`GET /v1/search/buildings`**
- **Description:** Full-text search with faceted filters
- **Query Parameters:**
  - `q` (string, optional) - search query
  - `page`, `limit` (same as buildings list)
  - `filters` (JSON string, optional) - `{"price": {"min": 500000, "max": 1000000}, "region": ["uuid1", "uuid2"], "developer": ["uuid3"]}`
  - `sort` (same as buildings list)
  - `currency` (same as buildings list)
  - `mapBounds` (string, optional) - `"lat1,lng1,lat2,lng2"` for bounding box search
- **Response:** Same structure as `GET /v1/buildings` with additional `facets`:
```json
{
  "data": [...],
  "pagination": {...},
  "facets": {
    "price": {
      "ranges": [
        {"min": 0, "max": 500000, "count": 45},
        {"min": 500000, "max": 1000000, "count": 80}
      ]
    },
    "regions": [
      {"id": "uuid", "name": {...}, "count": 25}
    ],
    "developers": [
      {"id": "uuid", "name": {...}, "count": 15}
    ]
  },
  "meta": {
    "query": "new building",
    "executionTimeMs": 45
  }
}
```

**`GET /v1/search/buildings/map`**
- **Description:** Geospatial search for map view (bounding box). Uses Search Service's own `search.building_locations` read-model (populated via events from Listings Service). Does NOT query `listings.*` schema directly.
- **Query Parameters:**
  - `bounds` (string, required) - `"southwest_lat,southwest_lng,northeast_lat,northeast_lng"`
  - `zoom` (integer, optional, 1-18) - map zoom level (for clustering)
  - `filters` (same as search)
  - `currency` (same as buildings list)
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "location": { "lat": 40.1811, "lng": 44.5144 },
      "title": {...},
      "pricePerM2Min": 500000,
      "pricePerM2Max": 800000,
      "primaryImage": {...}
    }
  ],
  "clusters": [
    {
      "location": { "lat": 40.18, "lng": 44.51 },
      "count": 5,
      "bounds": {...}
    }
  ]
}
```

**`GET /v1/search/developers`**
- **Description:** Search developers by name
- **Query Parameters:**
  - `q` (string, optional)
  - `page`, `limit`
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": { "am": "Դեվելոպեր ՍՊԸ", "ru": "Застройщик ООО", "en": "Developer LLC" },
      "logo": {"id": "uuid", "url": "https://cdn.example.com/logos/developer.jpg"},
      "buildingCount": 15
    }
  ],
  "pagination": {...}
}
```

---

#### 5.2.3 Developers & Regions

**`GET /v1/developers`**
- **Description:** List all developers
- **Query Parameters:**
  - `page`, `limit`
  - `sort` (enum: `name_asc`, `name_desc`, `building_count_desc`, default: `name_asc`)
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": { "am": "Դեվելոպեր ՍՊԸ", "ru": "Застройщик ООО", "en": "Developer LLC" },
      "description": { "am": "Վստահելի դեվելոպեր", "ru": "Надежный застройщик", "en": "Reliable developer" },
      "logo": {"id": "uuid", "url": "https://cdn.example.com/logos/developer.jpg"},
      "websiteUrl": "https://developer.example.com",
      "email": "developer@example.com",
      "phone": "+374 10 123456",
      "buildingCount": 15,
      "establishedYear": 2010
    }
  ],
  "pagination": {...}
}
```

**`GET /v1/developers/:id`**
- **Description:** Get developer detail with buildings
- **Query Parameters:**
  - `include_buildings` (boolean, default: true)
  - `buildings_page`, `buildings_limit` (if include_buildings=true)
- **Response:** Developer object with optional `buildings` array

**`GET /v1/regions`**
- **Description:** List regions (for filter dropdowns)
- **Query Parameters:**
  - `parent_id` (UUID, optional) - get child regions
  - `type` (enum: `city`, `district`, `neighborhood`, optional)
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": { "am": "Արաբկիր", "ru": "Арабкир", "en": "Arabkir" },
      "regionType": "district",
      "parentRegionId": "uuid",
      "buildingCount": 45
    }
  ]
}
```

---

#### 5.2.4 Blog & Content

**`GET /v1/blog/articles`**
- **Description:** List published blog articles
- **Query Parameters:**
  - `page`, `limit`
  - `sort` (enum: `date_desc`, `date_asc`, default: `date_desc`)
  - `category` (string, optional) - if categories implemented
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "article-slug",
      "title": { "am": "Բնակարանային շուկայի միտումներ", "ru": "Тенденции рынка недвижимости", "en": "Real Estate Market Trends" },
      "excerpt": { "am": "Վերջին միտումները բնակարանային շուկայում", "ru": "Последние тенденции на рынке недвижимости", "en": "Latest trends in the real estate market" },
      "featuredImage": {...},
      "publishedAt": "2024-01-15T10:00:00Z",
      "author": { "id": "uuid", "name": "Admin User" }
    }
  ],
  "pagination": {...}
}
```

**`GET /v1/blog/articles/:slug`**
- **Description:** Get article by slug
- **Response:**
```json
{
  "data": {
    "id": "uuid",
    "slug": "article-slug",
    "title": {...},
    "excerpt": {...},
    "body": {...},
    "featuredImage": {...},
    "seoMetadata": {
      "metaTitle": {...},
      "metaDescription": {...},
      "ogTitle": {...},
      "ogDescription": {...},
      "ogImage": {...},
      "canonicalUrl": "https://example.com/blog/article-slug",
      "structuredData": {...}
    },
    "publishedAt": "2024-01-15T10:00:00Z",
    "author": {...}
  }
}
```

**`GET /v1/pages/:slug`**
- **Description:** Get static page (About, Terms, Privacy)
- **Response:** Similar to article, but simpler structure

---

#### 5.2.5 Mortgage Calculator

**`POST /v1/calculator/mortgage`**
- **Description:** Calculate monthly mortgage payment
- **Request Body:**
```json
{
  "loanAmount": 50000000,
  "currency": "AMD",
  "interestRate": 8.5,
  "termYears": 20,
  "downPayment": 10000000
}
```
- **Response:**
```json
{
  "data": {
    "loanAmount": 50000000,
    "downPayment": 10000000,
    "principal": 40000000,
    "interestRate": 8.5,
    "termYears": 20,
    "termMonths": 240,
    "monthlyPayment": 347892.50,
    "totalPayment": 83494200,
    "totalInterest": 43494200,
    "currency": "AMD"
  }
}
```
- **Formula:** Standard amortization formula (ASSUMPTION: fixed-rate, monthly payments)

---

#### 5.2.6 Favorites

**`GET /v1/favorites`**
- **Description:** Get user's favorite buildings (if authenticated)
- **Headers:** `Authorization: Bearer <token>` (optional, if auth enabled)
- **Query Parameters:**
  - `page`, `limit`
- **Response:** Same as `GET /v1/buildings` but filtered to favorites
- **Note:** For anonymous users, favorites handled client-side (localStorage). This endpoint only for authenticated users.

**`POST /v1/favorites/:buildingId`**
- **Description:** Add building to favorites (if authenticated)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "data": {
    "buildingId": "uuid",
    "addedAt": "2024-01-15T10:00:00Z"
  }
}
```

**`DELETE /v1/favorites/:buildingId`**
- **Description:** Remove building from favorites (if authenticated)
- **Headers:** `Authorization: Bearer <token>`

---

#### 5.2.7 Analytics (Public Event Ingestion)

**`POST /v1/analytics/events`**
- **Description:** Track user events (views, clicks)
- **Request Body:**
```json
{
  "eventType": "building.viewed",
  "entityType": "building",
  "entityId": "uuid",
  "sessionId": "anonymous-session-id",
  "metadata": {
    "source": "listing_page",
    "referrer": "https://example.com"
  }
}
```
- **Rate Limiting:** 100 events per IP per minute (ASSUMPTION)
- **Response:**
```json
{
  "data": {
    "eventId": "uuid",
    "status": "recorded"
  }
}
```

---

### 5.3 Admin Endpoints

**Base Path:** `/v1/admin/`
**Authentication:** All admin endpoints require JWT token with `admin` or `super_admin` role.

**Headers Required:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json` (for POST/PUT)

---

#### 5.3.1 Buildings (Admin)

**`GET /v1/admin/buildings`**
- **Description:** List all buildings (including drafts, archived)
- **Query Parameters:** Same as public endpoint, plus:
  - `status` (enum: `draft`, `published`, `archived`, `all`, default: `all`)
- **Response:** Same structure, includes unpublished buildings

**`GET /v1/admin/buildings/:id`**
- **Description:** Get building detail (admin view, includes internal fields)

**`POST /v1/admin/buildings`**
- **Description:** Create new building
- **Request Body:**
```json
{
  "title": { "am": "Նոր Բնակարանային Համալիր", "ru": "Новый Жилой Комплекс", "en": "New Residential Complex" },
  "description": { "am": "Նորակառույց բնակարանային համալիր Երևանում", "ru": "Новостройка жилой комплекс в Ереване", "en": "New construction residential complex in Yerevan" },
  "address": { "am": "Երևան, Արաբկիր", "ru": "Ереван, Арабкир", "en": "Yerevan, Arabkir" },
  "location": { "lat": 40.1811, "lng": 44.5144 },
  "floors": 10,
  "totalUnits": 120,
  "commissioningDate": "2025-12-31",
  "constructionStatus": "under_construction",
  "pricePerM2Min": 500000,
  "pricePerM2Max": 800000,
  "areaMin": 45,
  "areaMax": 120,
  "currency": "AMD",
  "developerId": "uuid",
  "regionId": "uuid",
  "status": "draft",
  "isFeatured": false,
  "developerWebsiteUrl": "https://developer.example.com",
  "developerFacebookUrl": "https://facebook.com/developer",
  "developerInstagramUrl": "https://instagram.com/developer",
  "imageIds": ["uuid1", "uuid2"]
}
```
- **Response:** Created building object

**`PUT /v1/admin/buildings/:id`**
- **Description:** Update building
- **Request Body:** Same as POST (partial updates supported)

**`DELETE /v1/admin/buildings/:id`**
- **Description:** Soft delete building (sets status to `archived`)
- **Response:**
```json
{
  "data": {
    "id": "uuid",
    "status": "archived",
    "deletedAt": "2024-01-15T10:00:00Z"
  }
}
```

**`POST /v1/admin/buildings/:id/publish`**
- **Description:** Publish/unpublish building
- **Request Body:**
```json
{
  "publish": true
}
```
- **Response:** Updated building with `publishedAt` timestamp

**`GET /v1/admin/buildings/submissions`**
- **Description:** List building submissions (pending review)
- **Query Parameters:**
  - `status` (enum: `pending`, `approved`, `rejected`, `converted`, default: `pending`)
  - `page`, `limit`
- **Response:** List of submission objects

**`POST /v1/admin/buildings/submissions/:id/approve`**
- **Description:** Approve submission and optionally create building
- **Request Body:**
```json
{
  "createBuilding": true,
  "buildingData": { ... } // Optional overrides
}
```

---

#### 5.3.2 Media (Admin)

**`GET /v1/admin/media`**
- **Description:** List all media assets
- **Query Parameters:**
  - `page`, `limit`
  - `mime_type` (string, optional) - filter by MIME type
  - `processing_status` (enum: `pending`, `processing`, `completed`, `failed`, optional)
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "originalFilename": "image.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 2048576,
      "width": 1920,
      "height": 1080,
      "processingStatus": "completed",
      "url": "https://cdn.example.com/media/image.jpg",
      "thumbnailUrl": "https://cdn.example.com/media/thumb.jpg",
      "variants": {...},
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**`POST /v1/admin/media/upload`**
- **Description:** Upload media file
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file` (file, required)
  - `altText` (JSON string, optional) - `{"am": "Նկարի նկարագրություն", "ru": "Описание изображения", "en": "Image description"}`
  - `caption` (JSON string, optional)
- **Response:** Created media asset object

**`GET /v1/admin/media/:id`**
- **Description:** Get media asset detail

**`DELETE /v1/admin/media/:id`**
- **Description:** Delete media asset (and remove from MinIO)

**`POST /v1/admin/media/:id/process`**
- **Description:** Trigger reprocessing of image (regenerate thumbnails)

---

#### 5.3.3 Blog (Admin)

**`GET /v1/admin/blog/articles`**
- **Description:** List all articles (including drafts)
- **Query Parameters:** Same as public, plus `status` filter

**`POST /v1/admin/blog/articles`**
- **Description:** Create article
- **Request Body:**
```json
{
  "slug": "article-slug",
  "title": { "am": "Բնակարանային շուկայի միտումներ", "ru": "Тенденции рынка недвижимости", "en": "Real Estate Market Trends" },
  "excerpt": { "am": "Վերջին միտումները բնակարանային շուկայում", "ru": "Последние тенденции на рынке недвижимости", "en": "Latest trends in the real estate market" },
  "body": { "am": "Հոդվածի ամբողջական բովանդակությունը հայերենով", "ru": "Полное содержание статьи на русском", "en": "Full article content in English" },
  "featuredImageMediaId": "uuid",
  "status": "draft",
  "seoMetadata": {
    "metaTitle": {...},
    "metaDescription": {...},
    "ogTitle": {...},
    "ogDescription": {...},
    "ogImageMediaId": "uuid",
    "canonicalUrl": "https://example.com/buildings/uuid",
    "structuredData": {...}
  }
}
```

**`PUT /v1/admin/blog/articles/:id`**
- **Description:** Update article

**`DELETE /v1/admin/blog/articles/:id`**
- **Description:** Delete article

**`POST /v1/admin/blog/articles/:id/publish`**
- **Description:** Publish/unpublish article

---

#### 5.3.4 Analytics (Admin)

**`GET /v1/admin/analytics/dashboard`**
- **Description:** Get analytics dashboard data
- **Query Parameters:**
  - `period` (enum: `day`, `week`, `month`, `year`, default: `week`)
  - `startDate` (date, ISO 8601, optional)
  - `endDate` (date, ISO 8601, optional)
- **Response:**
```json
{
  "data": {
    "summary": {
      "totalViews": 15000,
      "totalClicks": 450,
      "totalBuildings": 120,
      "period": "week"
    },
    "topBuildings": [
      {
        "buildingId": "uuid",
        "title": {...},
        "views": 1250,
        "clicks": 45,
        "conversionRate": 3.6
      }
    ],
    "eventsByType": {
      "building.viewed": 12000,
      "contact.clicked": 300,
      "cta.clicked": 150
    },
    "trends": {
      "views": [{ "date": "2024-01-15", "count": 2000 }, ...],
      "clicks": [{ "date": "2024-01-15", "count": 60 }, ...]
    }
  }
}
```

**`GET /v1/admin/analytics/buildings/:id`**
- **Description:** Get analytics for specific building
- **Query Parameters:** `period`, `startDate`, `endDate`
- **Response:** Building-specific analytics (views, clicks over time)

**`GET /v1/admin/analytics/export`**
- **Description:** Export analytics data
- **Query Parameters:**
  - `format` (enum: `csv`, `json`, default: `csv`)
  - `startDate`, `endDate`
  - `eventType` (string, optional)
- **Response:** File download or JSON array

---

### 5.4 Authentication & Authorization Strategy

#### 5.4.1 Authentication (Phase 2, Optional for MVP)

**Approach: JWT (JSON Web Tokens)**

- **Token Type:** Bearer token in `Authorization` header
- **Token Structure:**
  - Header: `{"alg": "RS256", "typ": "JWT"}`
  - Payload: `{"sub": "user-id", "email": "user@example.com", "roles": ["user"], "iat": ..., "exp": ...}`
  - Signature: RSA-256 (private key in Auth Service, public key cached in Gateway)

**Endpoints (if Auth Service enabled):**
- `POST /v1/auth/register` → Register new user
- `POST /v1/auth/login` → Login (returns JWT)
- `POST /v1/auth/refresh` → Refresh access token (if refresh tokens implemented)
- `POST /v1/auth/logout` → Invalidate token (optional, if token blacklist used)
- `GET /v1/auth/me` → Get current user profile

**MVP Approach (No Auth):**
- Public endpoints: No authentication required
- Admin endpoints: API key or basic auth (ASSUMPTION: API key for MVP simplicity)
- Favorites: Client-side only (localStorage)

**Phase 2 Approach (With Auth):**
- Public endpoints: Optional authentication (for favorites sync)
- Admin endpoints: JWT with RBAC roles

---

#### 5.4.2 Authorization (RBAC)

**Roles:**
- `user` (default, if auth enabled) - Can manage own favorites
- `moderator` - Can approve building submissions, manage blog
- `admin` - Full CRUD on buildings, media, blog, view analytics
- `super_admin` - All admin permissions + user management, system settings

**Permission Matrix:**
| Endpoint | Public | User | Moderator | Admin | Super Admin |
|----------|--------|------|-----------|-------|-------------|
| `GET /v1/buildings` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /v1/buildings/submit` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /v1/admin/buildings` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /v1/admin/buildings` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /v1/admin/buildings/submissions/:id/approve` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `GET /v1/admin/analytics/dashboard` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /v1/admin/users` | ❌ | ❌ | ❌ | ❌ | ✅ |

**Implementation:**
- Gateway validates JWT and extracts roles
- Gateway checks role permissions before proxying to services
- Services can perform additional authorization checks if needed

---

### 5.5 Pagination & Sorting Conventions

#### 5.5.1 Pagination

**Standard Parameters:**
- `page` (integer, default: 1, min: 1) - page number (1-indexed)
- `limit` (integer, default: 20, min: 1, max: 100) - items per page

**Response Format:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Cursor-Based Pagination (Optional, for Phase 2):**
- For large datasets, consider cursor-based: `cursor` (string) and `limit`
- Response: `{"nextCursor": "eyJpZCI6InV1aWQiLCJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjAwOjAwWiJ9", "hasMore": true}`

---

#### 5.5.2 Sorting

**Standard Parameter:**
- `sort` (string) - Format: `field_direction` (e.g., `price_asc`, `date_desc`)

**Common Sort Options:**
- Buildings: `price_asc`, `price_desc`, `date_desc`, `date_asc`, `area_asc`, `area_desc`, `floors_asc`, `floors_desc`
- Articles: `date_desc`, `date_asc`, `title_asc`, `title_desc`
- Developers: `name_asc`, `name_desc`, `building_count_desc`

**Default Sort:**
- Buildings: `date_desc` (newest first)
- Articles: `date_desc`
- Developers: `name_asc`

**Multi-Field Sorting (Phase 2):**
- Format: `field1_asc,field2_desc` (comma-separated)

---

### 5.6 Error Format Standard

**Standard Error Response:**
```json
{
  "error": {
    "code": "BUILDING_NOT_FOUND",
    "message": "Building with ID 'uuid' not found",
    "details": {
      "buildingId": "uuid",
      "timestamp": "2024-01-15T10:00:00Z"
    },
    "requestId": "req-uuid",
    "statusCode": 404
  }
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content (for DELETE)
- `400` - Bad Request (validation errors, malformed request)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource, e.g., slug already exists)
- `422` - Unprocessable Entity (validation errors with details)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (downstream service unavailable)

**Error Codes (Examples):**
- `VALIDATION_ERROR` - Request validation failed
- `BUILDING_NOT_FOUND` - Building not found
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - Downstream service error
- `INTERNAL_ERROR` - Unexpected server error

**Validation Error Details:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": [
        {
          "field": "pricePerM2Min",
          "message": "must be a positive number",
          "value": -100
        },
        {
          "field": "commissioningDate",
          "message": "must be a valid date",
          "value": "invalid"
        }
      ]
    },
    "statusCode": 422
  }
}
```

---

### 5.7 OpenAPI Generation & Client Consumption

#### 5.7.1 OpenAPI Specification Generation

**Tool:** `@nestjs/swagger` (NestJS Swagger integration)

**Implementation:**
- Use decorators: `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiParam()`, `@ApiQuery()`, `@ApiBody()`
- Generate OpenAPI 3.0 spec: `npm run swagger:generate` → `openapi.json`
- Serve interactive docs: `GET /api-docs` (Swagger UI)
- Serve JSON spec: `GET /api-docs-json`

**Example:**
```typescript
@ApiTags('Buildings')
@Controller('v1/buildings')
export class BuildingsController {
  @Get()
  @ApiOperation({ summary: 'List buildings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Success', type: BuildingsListResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async list(@Query() query: BuildingsListQueryDto) {
    // ...
  }
}
```

**Contract-First Approach:**
- Define DTOs (Data Transfer Objects) with validation decorators
- Generate OpenAPI spec from DTOs
- Validate requests/responses against spec
- **ASSUMPTION:** Use class-validator and class-transformer for DTOs

---

#### 5.7.2 Client Consumption

**Generated Client Libraries:**
- Use `openapi-generator` or `swagger-codegen` to generate client SDKs
- Languages: TypeScript (for frontend), Python, Java (if needed)
- Command: `openapi-generator generate -i openapi.json -g typescript-axios -o ./clients/typescript`

**Frontend Integration (Nuxt 3):**
- Generate TypeScript client from OpenAPI spec
- Use in composables/services:
```typescript
import { BuildingsApi, Configuration } from '@/generated/api-client'

const config = new Configuration({
  basePath: 'https://api.example.com',
  accessToken: token // if auth enabled
})

const buildingsApi = new BuildingsApi(config)
const response = await buildingsApi.listBuildings({ page: 1, limit: 20 })
```

**Versioning:**
- Generate separate clients per API version (`v1`, `v2`)
- Frontend can use multiple clients simultaneously during migration

**Documentation:**
- Host OpenAPI spec at `/api-docs` (Swagger UI)
- Include examples, descriptions, and error responses
- Document rate limits, authentication requirements

---

## 6) Eventing & Consistency

### 6.1 Why NATS JetStream

**NATS JetStream Selection Rationale:**

1. **Persistence & Reliability:**
   - JetStream provides message persistence (unlike core NATS)
   - At-least-once delivery guarantees
   - Message replay capability (useful for debugging, reprocessing)

2. **Performance:**
   - High throughput (millions of messages/second)
   - Low latency (<1ms for local messages)
   - Efficient binary protocol

3. **Features:**
   - Streams (persistent message logs)
   - Consumers (subscriber groups with acknowledgments)
   - Dead Letter Queues (DLQ) built-in
   - Message deduplication (idempotency support)
   - TTL and retention policies

4. **Operational Simplicity:**
   - Single binary, easy to deploy
   - No external dependencies (self-contained)
   - Clustering support for high availability
   - Monitoring via Prometheus metrics

5. **Cost Efficiency:**
   - Open source, no licensing costs
   - Lower resource usage compared to Kafka (for our scale)
   - Simpler operational overhead than Kafka

**Alternatives Considered:**
- **Apache Kafka:** Over-engineered for MVP scale, higher operational complexity
- **RabbitMQ:** Good choice, but JetStream provides better persistence and simpler setup
- **Redis Streams:** Limited features, not designed for event sourcing patterns
- **AWS SQS/SNS:** Vendor lock-in, higher cost at scale

**ASSUMPTION:** Start with single NATS JetStream instance, scale to cluster if needed (Phase 2).

---

### 6.2 Event Catalog

**Event Naming Convention:**
- Format: `{service}.{entity}.{action}`
- Examples: `listings.building.created`, `media.image.processed`

**Event Structure:**
```json
{
  "eventId": "uuid",
  "eventType": "listings.building.created",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": { ... },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "listings-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

---

#### 6.2.1 Listings Service Events

**`listings.building.created`**
```json
{
  "eventId": "uuid",
  "eventType": "listings.building.created",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": {
    "buildingId": "uuid",
    "developerId": "uuid",
    "regionId": "uuid",
    "title": { "am": "Նոր Բնակարանային Համալիր", "ru": "Новый Жилой Комплекс", "en": "New Residential Complex" },
    "status": "draft",
    "location": { "lat": 40.1811, "lng": 44.5144 },
    "pricePerM2Min": 500000,
    "pricePerM2Max": 800000,
    "areaMin": 45,
    "areaMax": 120,
    "floors": 10,
    "commissioningDate": "2025-12-31"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "listings-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "userId": "admin-uuid"
  }
}
```

**`listings.building.updated`**
```json
{
  "eventId": "uuid",
  "eventType": "listings.building.updated",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": {
    "buildingId": "uuid",
    "changes": {
      "pricePerM2Min": 520000,
      "pricePerM2Max": 820000
    },
    "updatedFields": ["pricePerM2Min", "pricePerM2Max"],
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "listings-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`listings.building.published`**
```json
{
  "eventId": "uuid",
  "eventType": "listings.building.published",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": {
    "buildingId": "uuid",
    "publishedAt": "2024-01-15T10:00:00Z",
    "status": "published"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "listings-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`listings.building.deleted`**
```json
{
  "eventId": "uuid",
  "eventType": "listings.building.deleted",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": {
    "buildingId": "uuid",
    "deletedAt": "2024-01-15T10:00:00Z",
    "status": "archived"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "listings-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`listings.pricing.updated`**
```json
{
  "eventId": "uuid",
  "eventType": "listings.pricing.updated",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": {
    "buildingId": "uuid",
    "pricePerM2Min": 520000,
    "pricePerM2Max": 820000,
    "currency": "AMD",
    "snapshotId": "uuid",
    "snapshotDate": "2024-01-15",
    "previousPricePerM2Min": 500000,
    "previousPricePerM2Max": 800000,
    "priceChangePercent": 4.0
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "listings-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`listings.developer.created`**
```json
{
  "eventId": "uuid",
  "eventType": "listings.developer.created",
  "aggregateId": "developer-uuid",
  "aggregateType": "developer",
  "payload": {
    "developerId": "uuid",
    "name": { "am": "Դեվելոպեր ՍՊԸ", "ru": "Застройщик ООО", "en": "Developer LLC" },
    "email": "developer@example.com",
    "phone": "+374 10 123456"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "listings-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

---

#### 6.2.2 Media Service Events

**`media.uploaded`**
```json
{
  "eventId": "uuid",
  "eventType": "media.uploaded",
  "aggregateId": "media-uuid",
  "aggregateType": "media",
  "payload": {
    "mediaId": "uuid",
    "originalFilename": "image.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 2048576,
    "bucket": "buildings-media",
    "objectKey": "2024/01/image-uuid.jpg",
    "width": 1920,
    "height": 1080
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "media-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`media.image.processed`**
```json
{
  "eventId": "uuid",
  "eventType": "media.image.processed",
  "aggregateId": "media-uuid",
  "aggregateType": "media",
  "payload": {
    "mediaId": "uuid",
    "processingStatus": "completed",
    "variants": [
      {
        "size": "thumbnail",
        "width": 150,
        "height": 150,
        "url": "https://cdn.example.com/media/thumbnail.jpg"
      },
      {
        "size": "small",
        "width": 300,
        "height": 300,
        "url": "https://cdn.example.com/media/small.jpg"
      },
      {
        "size": "medium",
        "width": 800,
        "height": 800,
        "url": "https://cdn.example.com/media/medium.jpg"
      },
      {
        "size": "large",
        "width": 1200,
        "height": 1200,
        "url": "https://cdn.example.com/media/large.jpg"
      }
    ],
    "thumbnailUrl": "https://cdn.example.com/media/thumbnail.jpg"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "media-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`media.processing.failed`**
```json
{
  "eventId": "uuid",
  "eventType": "media.processing.failed",
  "aggregateId": "media-uuid",
  "aggregateType": "media",
  "payload": {
    "mediaId": "uuid",
    "processingStatus": "failed",
    "error": "Invalid image format",
    "retryCount": 2,
    "maxRetries": 3
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "media-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

---

#### 6.2.3 Search Service Events

**`search.index.synced`**
```json
{
  "eventId": "uuid",
  "eventType": "search.index.synced",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": {
    "entityType": "building",
    "entityId": "uuid",
    "status": "success",
    "indexedAt": "2024-01-15T10:00:00Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "search-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`search.query.executed`**
```json
{
  "eventId": "uuid",
  "eventType": "search.query.executed",
  "aggregateId": null,
  "aggregateType": "search",
  "payload": {
    "query": "new building",
    "filters": { "price": { "min": 500000 }, "region": ["uuid"] },
    "resultCount": 25,
    "executionTimeMs": 45,
    "zeroResults": false
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "search-service",
    "sessionId": "anonymous-session-id"
  }
}
```

---

#### 6.2.4 Analytics Service Events

**`analytics.event.ingested`**
```json
{
  "eventId": "uuid",
  "eventType": "analytics.event.ingested",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": {
    "eventType": "building.viewed",
    "entityType": "building",
    "entityId": "uuid",
    "sessionId": "anonymous-session-id",
    "metadata": {
      "source": "listing_page",
      "referrer": "https://example.com"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "analytics-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`analytics.aggregate.computed`**
```json
{
  "eventId": "uuid",
  "eventType": "analytics.aggregate.computed",
  "aggregateId": "building-uuid",
  "aggregateType": "building",
  "payload": {
    "period": "daily",
    "entityType": "building",
    "entityId": "uuid",
    "metric": "building_views",
    "value": 1250,
    "periodStart": "2024-01-15T00:00:00Z",
    "periodEnd": "2024-01-16T00:00:00Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "analytics-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

---

#### 6.2.5 Content Service Events

**`content.article.created`**
```json
{
  "eventId": "uuid",
  "eventType": "content.article.created",
  "aggregateId": "article-uuid",
  "aggregateType": "article",
  "payload": {
    "articleId": "uuid",
    "slug": "article-slug",
    "status": "draft",
    "authorId": "admin-uuid"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "content-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

**`content.article.published`**
```json
{
  "eventId": "uuid",
  "eventType": "content.article.published",
  "aggregateId": "article-uuid",
  "aggregateType": "article",
  "payload": {
    "articleId": "uuid",
    "slug": "article-slug",
    "publishedAt": "2024-01-15T10:00:00Z",
    "seoMetadata": {
      "metaTitle": {...},
      "canonicalUrl": "https://example.com/blog/article-slug"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "content-service",
    "version": "1.0",
    "correlationId": "req-uuid",
    "causationId": "event-uuid"
  }
}
```

---

### 6.3 Outbox Pattern Implementation

**Purpose:** Ensure reliable event publishing when database transaction commits.

**Problem:** If we publish event directly and then DB transaction fails, event is published but data isn't saved (inconsistency).

**Solution: Outbox Pattern**

**Implementation:**

1. **Outbox Table (per service):**
```sql
CREATE TABLE listings.outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_status ON listings.outbox(status, created_at) WHERE status = 'pending';
```

2. **Transaction Flow:**
   - Start database transaction
   - Insert/update business data (e.g., building)
   - Insert event into outbox table (same transaction)
   - Commit transaction
   - **After commit:** Outbox processor picks up pending events and publishes to NATS

3. **Outbox Processor (Background Worker):**
   - Polls `outbox` table for `status = 'pending'` events
   - Publishes to NATS JetStream
   - Updates `status = 'published'` on success
   - Handles retries on failure (see retry policy)

**Benefits:**
- Atomic: Event creation and business data in same transaction
- Reliable: Events are persisted even if NATS is temporarily unavailable
- Recoverable: Can replay events if needed

**ASSUMPTION:** Use polling interval of 1-5 seconds (configurable). Consider change data capture (CDC) for Phase 2 if higher throughput needed.

---

### 6.4 Inbox Pattern (Idempotent Consumers)

**Purpose:** Ensure idempotent event processing (handle duplicate events safely).

**Problem:** If consumer processes event but crashes before acknowledging, event may be redelivered (duplicate).

**Solution: Inbox Pattern**

**Implementation:**

1. **Inbox Table (per service):**
```sql
CREATE TABLE search.inbox (
  id UUID PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL UNIQUE, -- From event metadata
  event_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inbox_status ON search.inbox(status, created_at) WHERE status = 'pending';
CREATE UNIQUE INDEX idx_inbox_event_id ON search.inbox(event_id);
```

2. **Consumer Flow:**
   - Receive event from NATS
   - Check if `event_id` exists in inbox (idempotency check)
   - If exists and `status = 'processed'` → Skip (already processed)
   - If exists and `status = 'pending'` → Retry processing
   - If not exists → Insert into inbox with `status = 'pending'`
   - Process event (e.g., update Meilisearch index)
   - Update inbox `status = 'processed'`
   - Acknowledge message to NATS

**Benefits:**
- Idempotent: Duplicate events are safely ignored
- Recoverable: Failed events can be retried
- Auditable: Track all events received

---

### 6.5 Idempotency Keys & Deduplication

**Idempotency Key Strategy:**

1. **Event-Level Idempotency:**
   - Use `eventId` (UUID) from event metadata
   - Store in inbox table as unique constraint
   - Prevents duplicate processing

2. **Request-Level Idempotency (for idempotent endpoints):**
   - Client sends `Idempotency-Key` header (UUID)
   - Server stores key with response in Redis (TTL: 24 hours)
   - If same key received, return cached response
   - **Endpoints:** `POST /v1/admin/buildings`, `PUT /v1/admin/buildings/:id`, `POST /v1/admin/media/upload`

**NATS JetStream Deduplication:**
- Configure stream with `MaxAge` and `DuplicateWindow`
- `DuplicateWindow`: 2 minutes (ASSUMPTION) - deduplicates messages within window
- Uses `Nats-Msg-Id` header for deduplication

**Example:**
```typescript
// Client sends idempotent request
const idempotencyKey = generateUUID()
const response = await fetch('/v1/admin/buildings', {
  method: 'POST',
  headers: {
    'Idempotency-Key': idempotencyKey,
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(buildingData)
})

// Server checks Redis for idempotency key
// If exists, return cached response
// If not, process request and cache response
```

---

### 6.6 Retry Policies

**Retry Strategy per Event Type:**

1. **Transient Failures (network, temporary service unavailability):**
   - **Max Retries:** 3-5
   - **Backoff:** Exponential (1s, 2s, 4s, 8s)
   - **Action:** Retry automatically

2. **Permanent Failures (validation errors, business logic errors):**
   - **Max Retries:** 0 (don't retry)
   - **Action:** Move to DLQ immediately

3. **Timeout Failures:**
   - **Max Retries:** 2
   - **Backoff:** Linear (5s, 10s)
   - **Action:** Retry, then DLQ if still failing

**Implementation:**

**Outbox Retry:**
```typescript
// Outbox processor retry logic
const maxRetries = 5
const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30s

if (retryCount < maxRetries) {
  await delay(backoffMs)
  await publishToNATS(event)
  retryCount++
} else {
  status = 'failed'
  // Alert admin, move to DLQ
}
```

**Consumer Retry:**
- NATS JetStream provides automatic redelivery
- Configure `MaxDeliver` (max redelivery attempts)
- After `MaxDeliver`, message goes to DLQ

**NATS JetStream Configuration:**
```yaml
streams:
  - name: listings-events
    subjects: ["listings.>"]
    retention: interest
    max_age: 7d
    duplicate_window: 2m
    consumers:
      - name: search-consumer
        durable: search-consumer
        ack_policy: explicit
        max_deliver: 5
        ack_wait: 30s
        backoff: [1s, 2s, 4s, 8s, 16s]
```

---

### 6.7 Dead Letter Queue (DLQ) Strategy

**Purpose:** Capture events that failed after all retries for manual investigation.

**Implementation:**

1. **NATS JetStream DLQ:**
   - Configure consumer with `MaxDeliver` (e.g., 5)
   - After max deliveries, message is moved to DLQ stream
   - DLQ stream: `listings-events-dlq`

2. **DLQ Monitoring:**
   - Alert when DLQ receives messages (P0 - critical)
   - Dashboard showing DLQ message count, event types
   - Manual review and reprocessing capability

3. **DLQ Processing:**
   - Admin can view DLQ messages via admin API
   - Fix underlying issue (e.g., data validation, service availability)
   - Reprocess messages manually or via admin action

**DLQ Stream Configuration:**
```yaml
streams:
  - name: listings-events-dlq
    subjects: ["$JS.ACK.listings-events.search-consumer.>"]
    retention: workqueue
    max_age: 30d  # Keep for 30 days for investigation
```

**Admin Endpoint (Phase 2):**
- `GET /v1/admin/events/dlq` → List DLQ messages
- `POST /v1/admin/events/dlq/:id/reprocess` → Reprocess message

---

### 6.8 Consistency Model per Feature

#### 6.8.1 Favorites

**Consistency Model: Eventually Consistent**

**Implementation:**
- **MVP (Anonymous):** Client-side only (localStorage) → No consistency concerns
- **Phase 2 (Authenticated):** 
  - Write: Synchronous (immediate DB write)
  - Read: Synchronous (read from DB)
  - **Consistency:** Strong consistency (single service, single DB)

**Event Flow (if extracted to separate service):**
- User adds favorite → Favorites Service writes to DB
- Publish `favorites.building.added` (optional, for analytics)
- Analytics Service consumes event (eventually consistent)

---

#### 6.8.2 Pricing & Pricing Snapshots

**Consistency Model: Eventually Consistent (for snapshots), Strong (for current price)**

**Implementation:**
- **Current Price:** Strong consistency (updated in same transaction as building)
- **Pricing Snapshots:** Eventually consistent
  - Building price updated → `listings.pricing.updated` event
  - Snapshot creation triggered asynchronously (if threshold met)
  - Snapshot saved to DB (eventually consistent with price update)

**Trade-off:** Snapshot creation delay (few seconds) is acceptable for analytics/history.

---

#### 6.8.3 Search Indexing

**Consistency Model: Eventually Consistent**

**Implementation:**
- Building created/updated → `listings.building.*` events
- Search Service consumes events → Updates Meilisearch index AND `search.building_locations` read-model
- **Delay:** 1-5 seconds (outbox processing + event delivery)
- **Acceptable:** Search results may be slightly stale (acceptable for read-heavy workload)
- **Note:** Search Service does NOT query `listings.*` schema directly. All data syncs via events to Search-owned read-model.

**Mitigation:**
- For critical updates (publish/unpublish), consider synchronous index update (optional)
- Or: Admin can trigger manual reindex via `POST /v1/admin/search/reindex`

**Read-After-Write Consistency:**
- **Problem:** User creates building, immediately searches → building not in results
- **Solution:** 
  - Option 1: Accept eventual consistency (recommended for MVP)
  - Option 2: Return building in search results even if not indexed yet (hybrid: DB + Meilisearch)
  - Option 3: Synchronous index update for publish action (slower, but consistent)

**ASSUMPTION:** Accept eventual consistency for MVP. Implement hybrid search (DB + Meilisearch) for Phase 2 if needed.

---

#### 6.8.4 Media Processing

**Consistency Model: Eventually Consistent**

**Implementation:**
- Image uploaded → `media.uploaded` event
- Image processing worker processes image → `media.image.processed` event
- Building references image → Can reference image before processing completes
- **UI:** Show placeholder or original image until thumbnail ready

**Trade-off:** Acceptable delay (few seconds) for image processing.

---

#### 6.8.5 Analytics Aggregation

**Consistency Model: Eventually Consistent**

**Implementation:**
- Event ingested → Saved to `analytics.events` (strong consistency)
- Aggregation job runs periodically (hourly/daily) → Computes aggregates
- Dashboard reads from aggregates table (may be 1 hour behind real-time)

**Real-Time vs. Batch:**
- **Real-Time Events:** Available immediately (for recent events query)
- **Aggregates:** Updated hourly/daily (for performance, acceptable delay)

**Trade-off:** Dashboard shows near-real-time for recent data, aggregated for historical.

---

### 6.9 Event Sourcing Considerations (Optional, Phase 2)

**Note:** Current design uses **Event-Driven Architecture**, not full Event Sourcing.

**Event Sourcing (if needed later):**
- Store all events as source of truth
- Rebuild aggregates from events
- Benefits: Full audit trail, time travel, replay capability
- Trade-offs: Higher complexity, event versioning challenges

**Current Approach:**
- Events for inter-service communication
- Database as source of truth for aggregates
- Events stored in outbox/inbox for reliability, but not for rebuilding state

**Migration Path (if needed):**
- Can evolve to Event Sourcing by storing events permanently and adding event replay logic

---

### 6.10 Event Versioning & Schema Evolution

**Versioning Strategy:**

1. **Event Metadata Version:**
   - Include `version` in event metadata (e.g., `"version": "1.0"`)
   - Consumers check version before processing

2. **Backward Compatibility:**
   - Add new optional fields (backward compatible)
   - Don't remove fields (mark as deprecated)
   - New required fields → New event version

3. **Version Migration:**
   - Support multiple versions simultaneously
   - Consumers handle multiple versions (transform if needed)
   - Deprecate old versions after migration period

**Example:**
```json
// Version 1.0
{
  "eventType": "listings.building.created",
  "payload": {
    "buildingId": "uuid",
    "pricePerM2Min": 500000
  },
  "metadata": { "version": "1.0" }
}

// Version 1.1 (backward compatible - added optional field)
{
  "eventType": "listings.building.created",
  "payload": {
    "buildingId": "uuid",
    "pricePerM2Min": 500000,
    "pricePerM2Max": 800000  // New optional field
  },
  "metadata": { "version": "1.1" }
}

// Version 2.0 (breaking - changed structure)
{
  "eventType": "listings.building.created.v2",
  "payload": {
    "building": { ... }  // Restructured
  },
  "metadata": { "version": "2.0" }
}
```

**ASSUMPTION:** Start with version 1.0, evolve schema carefully with backward compatibility in mind.

---

## 7) Frontend (Nuxt 3) Architecture

### 7.1 Routes & Pages Structure

**File-Based Routing (Nuxt 3):**

```
pages/
├── index.vue                    # Homepage (buildings list + map)
├── buildings/
│   ├── index.vue               # Buildings listing page (list view)
│   ├── [id].vue                # Building detail page
│   └── map.vue                 # Map-only view (optional)
├── search/
│   └── index.vue               # Search results page
├── developers/
│   ├── index.vue               # Developers list
│   └── [id].vue                # Developer detail page
├── blog/
│   ├── index.vue               # Blog articles list
│   └── [slug].vue              # Article detail page
├── calculator/
│   └── mortgage.vue            # Mortgage calculator page
├── submit/
│   └── building.vue            # "Add building" submission form
├── favorites.vue               # Favorites page (if authenticated)
├── about.vue                   # Static page (About)
├── terms.vue                   # Static page (Terms)
└── privacy.vue                 # Static page (Privacy Policy)
```

**Route Patterns:**
- `/` → Homepage (buildings list with map)
- `/buildings` → Buildings listing (list view)
- `/buildings/[id]` → Building detail (e.g., `/buildings/123e4567-e89b-12d3-a456-426614174000`)
- `/buildings/map` → Map-only view (optional)
- `/search?q=...` → Search results
- `/developers` → Developers list
- `/developers/[id]` → Developer detail
- `/blog` → Blog articles list
- `/blog/[slug]` → Article detail (e.g., `/blog/new-buildings-2024`)
- `/calculator/mortgage` → Mortgage calculator
- `/submit/building` → Building submission form
- `/favorites` → User favorites (if authenticated)
- `/about`, `/terms`, `/privacy` → Static pages

**Dynamic Routes:**
- Building ID: UUID format (validated in middleware)
- Article slug: URL-friendly string (validated: alphanumeric + hyphens)
- Developer ID: UUID format

**Route Middleware:**
- `middleware/auth.ts` → Check authentication (for admin/favorites)
- `middleware/validate-uuid.ts` → Validate UUID route params
- `middleware/rate-limit.ts` → Client-side rate limiting (optional)

---

### 7.2 Components Structure

**Component Organization:**

```
components/
├── buildings/
│   ├── BuildingCard.vue        # Building card (list item)
│   ├── BuildingDetail.vue      # Building detail view
│   ├── BuildingFilters.vue     # Filter sidebar/panel
│   ├── BuildingGallery.vue     # Image gallery
│   ├── BuildingMap.vue         # Map view (client-only wrapper)
│   └── BuildingSubmissionForm.vue # Submission form
├── developers/
│   ├── DeveloperCard.vue
│   └── DeveloperDetail.vue
├── blog/
│   ├── ArticleCard.vue
│   └── ArticleDetail.vue
├── calculator/
│   └── MortgageCalculator.vue
├── common/
│   ├── AppHeader.vue           # Site header/navigation
│   ├── AppFooter.vue           # Site footer
│   ├── CurrencyToggle.vue      # AMD/USD toggle
│   ├── LanguageSwitcher.vue    # AM/RU/EN switcher
│   ├── Pagination.vue          # Pagination component
│   ├── LoadingSpinner.vue     # Loading indicator
│   ├── SkeletonLoader.vue      # Skeleton loading state
│   ├── ErrorBoundary.vue       # Error handling
│   └── SEOHead.vue             # SEO meta tags component
├── map/
│   ├── MapContainer.vue        # Leaflet map container (client-only)
│   ├── MapMarker.vue           # Building marker
│   └── MapCluster.vue          # Marker cluster
└── admin/                       # Admin panel components (if separate admin app)
    ├── AdminLayout.vue
    ├── BuildingForm.vue
    └── MediaUpload.vue
```

**Component Naming:**
- PascalCase for component files
- Descriptive names (e.g., `BuildingCard` not `Card`)
- Group related components in folders

**Component Props & Emits:**
- Use TypeScript interfaces for props
- Document props with JSDoc comments
- Use `defineProps<T>()` and `defineEmits<T>()` (Vue 3 Composition API)

---

### 7.3 Composables Structure

**Composables (Reusable Logic):**

```
composables/
├── useBuildings.ts             # Buildings data fetching, filters, pagination
├── useBuildingDetail.ts         # Single building data
├── useSearch.ts                # Search functionality
├── useMap.ts                   # Map state, bounds, clustering
├── useFavorites.ts             # Favorites management (localStorage + API)
├── useCurrency.ts              # Currency conversion, toggle state
├── useAnalytics.ts             # Event tracking (views, clicks)
├── useMortgageCalculator.ts    # Mortgage calculation logic
├── useApi.ts                   # API client wrapper (generated from OpenAPI)
├── usePagination.ts            # Pagination state management
└── useI18n.ts                  # i18n helpers (locale, translations)
```

**Example: `useBuildings.ts`**
```typescript
export const useBuildings = () => {
  const buildings = ref<Building[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const pagination = ref<Pagination>({ page: 1, limit: 20, total: 0 })
  const filters = ref<BuildingFilters>({})
  const sort = ref<SortOption>('date_desc')
  const currency = useCurrency()

  const fetchBuildings = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await buildingsApi.listBuildings({
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...filters.value,
        sort: sort.value,
        currency: currency.value
      })
      buildings.value = response.data.data
      pagination.value = response.data.pagination
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  const updateFilters = (newFilters: Partial<BuildingFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1 // Reset to first page
    fetchBuildings()
  }

  return {
    buildings,
    loading,
    error,
    pagination,
    filters,
    sort,
    fetchBuildings,
    updateFilters
  }
}
```

**Example: `useFavorites.ts`**
```typescript
export const useFavorites = () => {
  const favorites = ref<string[]>([]) // Building IDs
  const isAuthenticated = ref(false) // From auth composable

  // Load from localStorage (anonymous) or API (authenticated)
  const loadFavorites = () => {
    if (isAuthenticated.value) {
      // Fetch from API
      favoritesApi.getFavorites().then(res => {
        favorites.value = res.data.data.map(b => b.id)
      })
    } else {
      // Load from localStorage
      const stored = localStorage.getItem('favorites')
      favorites.value = stored ? JSON.parse(stored) : []
    }
  }

  const toggleFavorite = async (buildingId: string) => {
    const index = favorites.value.indexOf(buildingId)
    if (index > -1) {
      favorites.value.splice(index, 1)
      if (isAuthenticated.value) {
        await favoritesApi.deleteFavorite(buildingId)
      } else {
        localStorage.setItem('favorites', JSON.stringify(favorites.value))
      }
    } else {
      favorites.value.push(buildingId)
      if (isAuthenticated.value) {
        await favoritesApi.addFavorite(buildingId)
      } else {
        localStorage.setItem('favorites', JSON.stringify(favorites.value))
      }
    }
  }

  const isFavorite = (buildingId: string) => {
    return favorites.value.includes(buildingId)
  }

  return {
    favorites,
    loadFavorites,
    toggleFavorite,
    isFavorite
  }
}
```

---

### 7.4 State Management Strategy (Pinia)

**Store Structure:**

```
stores/
├── buildings.ts                # Buildings list state, filters, pagination
├── buildingDetail.ts           # Current building detail
├── search.ts                   # Search query, results, facets
├── map.ts                      # Map state (bounds, zoom, selected marker)
├── favorites.ts                # Favorites list (syncs with composable)
├── currency.ts                 # Currency preference (AMD/USD)
├── i18n.ts                     # Language preference (AM/RU/EN)
└── analytics.ts                # Analytics events queue (for batching)
```

**Example: `stores/buildings.ts`**
```typescript
import { defineStore } from 'pinia'

export const useBuildingsStore = defineStore('buildings', {
  state: () => ({
    buildings: [] as Building[],
    loading: false,
    error: null as Error | null,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    filters: {} as BuildingFilters,
    sort: 'date_desc' as SortOption
  }),

  getters: {
    hasMore: (state) => state.pagination.page < state.pagination.totalPages,
    filteredCount: (state) => state.pagination.total
  },

  actions: {
    async fetchBuildings() {
      this.loading = true
      this.error = null
      try {
        const response = await buildingsApi.listBuildings({
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters,
          sort: this.sort
        })
        this.buildings = response.data.data
        this.pagination = response.data.pagination
      } catch (err) {
        this.error = err as Error
      } finally {
        this.loading = false
      }
    },

    updateFilters(newFilters: Partial<BuildingFilters>) {
      this.filters = { ...this.filters, ...newFilters }
      this.pagination.page = 1
      this.fetchBuildings()
    },

    resetFilters() {
      this.filters = {}
      this.sort = 'date_desc'
      this.pagination.page = 1
      this.fetchBuildings()
    }
  },

  persist: {
    storage: persistedState.localStorage,
    paths: ['filters', 'sort'] // Persist filters and sort preference
  }
})
```

**When to Use Pinia vs Composables:**
- **Pinia:** Global state shared across multiple pages/components (buildings list, filters, currency, language)
- **Composables:** Reusable logic that may or may not need global state (API calls, calculations, utilities)
- **Hybrid:** Composables can use Pinia stores internally

**Persistence:**
- Use `pinia-plugin-persistedstate` for localStorage persistence
- Persist: filters, currency, language preference
- Don't persist: loading states, temporary data, API responses (cache in memory only)

---

### 7.5 Map Implementation Details (Leaflet + Client-Only)

**Why Leaflet:**
- Lightweight, open-source, well-documented
- Good plugin ecosystem (clustering, drawing, etc.)
- Works well with SSR (client-only rendering)
- **ASSUMPTION:** Alternative considered: Mapbox GL JS (requires API key, more complex)

**Implementation Approach:**

1. **Client-Only Component:**
```vue
<!-- components/map/MapContainer.vue -->
<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  buildings: Building[]
  center?: [number, number]
  zoom?: number
}>()

const mapContainer = ref<HTMLElement>()
let map: L.Map | null = null
let markers: L.Marker[] = []

onMounted(async () => {
  // Only run on client
  if (process.client && mapContainer.value) {
    // Dynamically import Leaflet (code splitting)
    const L = await import('leaflet')
    
    map = L.map(mapContainer.value, {
      center: props.center || [40.1811, 44.5144], // Yerevan default
      zoom: props.zoom || 12
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Add markers
    updateMarkers()
  }
})

const updateMarkers = () => {
  if (!map) return
  
  // Remove existing markers
  markers.forEach(m => m.remove())
  markers = []

  // Add new markers
  props.buildings.forEach(building => {
    const marker = L.marker([building.location.lat, building.location.lng], {
      title: building.title
    })
    marker.bindPopup(`<b>${building.title}</b><br>${building.address}`)
    marker.addTo(map!)
    markers.push(marker)
  })

  // Fit bounds to show all markers
  if (markers.length > 0) {
    const group = new L.FeatureGroup(markers)
    map.fitBounds(group.getBounds().pad(0.1))
  }
}

watch(() => props.buildings, updateMarkers, { deep: true })

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 500px;
}
</style>
```

2. **SSR Caveats:**
- Use `<ClientOnly>` wrapper in pages:
```vue
<template>
  <div>
    <BuildingFilters />
    <ClientOnly>
      <MapContainer :buildings="buildings" />
      <template #fallback>
        <MapSkeleton /> <!-- Loading skeleton -->
      </template>
    </ClientOnly>
  </div>
</template>
```

3. **Marker Clustering:**
- Use `leaflet.markercluster` plugin
- Install: `npm install leaflet.markercluster @types/leaflet.markercluster`
- Implementation:
```typescript
import MarkerClusterGroup from 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

const markers = MarkerClusterGroup({
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false
})

props.buildings.forEach(building => {
  const marker = L.marker([building.location.lat, building.location.lng])
  marker.bindPopup(`<b>${building.title}</b>`)
  markers.addLayer(marker)
})

map.addLayer(markers)
```

4. **Map Bounds Filtering:**
- When map bounds change, fetch buildings in viewport
- Use `map.on('moveend')` event
- Debounce API calls (500ms) to avoid excessive requests
- Update buildings list based on map bounds

5. **Performance Optimizations:**
- Lazy load Leaflet (dynamic import)
- Use marker clustering for >50 markers
- Virtualize markers (only render visible markers) for >1000 markers (Phase 2)
- Cache map tiles (browser cache)

---

### 7.6 i18n Approach (AM/RU/EN)

**Setup: `nuxt/i18n` Module**

1. **Configuration (`nuxt.config.ts`):**
```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'am', iso: 'hy-AM', name: 'Հայերեն', file: 'am.json' },
      { code: 'ru', iso: 'ru-RU', name: 'Русский', file: 'ru.json' },
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json' }
    ],
    defaultLocale: 'am',
    strategy: 'prefix_except_default', // /ru/..., /en/..., / (AM)
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    },
    vueI18n: './i18n.config.ts'
  }
})
```

2. **Translation Files:**
```
locales/
├── am.json
├── ru.json
└── en.json
```

**Example `locales/am.json`:**
```json
{
  "common": {
    "search": "Որոնել",
    "filters": "Ֆիլտրեր",
    "sort": "Տեսակավորել",
    "price": "Գին",
    "area": "Տարածք",
    "currency": "Արժույթ"
  },
  "buildings": {
    "title": "Նորակառույցներ",
    "fromPrice": "Սկսած",
    "pricePerM2": "գին մ²-ից",
    "floors": "Հարկեր",
    "commissioningDate": "Հանձնման ամսաթիվ"
  }
}
```

3. **Usage in Components:**
```vue
<template>
  <h1>{{ $t('buildings.title') }}</h1>
  <p>{{ $t('buildings.fromPrice') }}: {{ formatPrice(building.pricePerM2Min) }}</p>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

// Programmatic usage
const title = t('buildings.title')

// Change language
const switchLanguage = (lang: 'am' | 'ru' | 'en') => {
  locale.value = lang
}
</script>
```

4. **API Response Handling:**
- API returns multi-language JSONB fields: `{ "am": "Նորակառույց", "ru": "Новостройка", "en": "New Building" }`
- Frontend extracts appropriate language:
```typescript
const getLocalizedText = (text: MultiLangText, locale: string): string => {
  return text[locale] || text.am || text.ru || text.en // Fallback chain
}

// In component
const buildingTitle = getLocalizedText(building.title, locale.value)
```

5. **SEO Considerations:**
- Use `hreflang` tags for multi-language pages
- Generate sitemap per language
- Set `lang` attribute on `<html>` tag (handled by nuxt/i18n)

---

### 7.7 SEO Checklist

**Meta Tags & Open Graph:**

✅ **Page Title:**
- Unique, descriptive titles (60 characters max)
- Include building name, location, price range
- Format: `{Building Name} - New Building in {Location} | Site Name`

✅ **Meta Description:**
- Unique descriptions (150-160 characters)
- Include key information (price, location, features)
- Compelling call-to-action

✅ **Open Graph Tags:**
```vue
<template>
  <Head>
    <title>{{ seoTitle }}</title>
    <meta name="description" :content="seoDescription" />
    <meta property="og:title" :content="seoTitle" />
    <meta property="og:description" :content="seoDescription" />
    <meta property="og:image" :content="ogImageUrl" />
    <meta property="og:type" content="website" />
    <meta property="og:url" :content="canonicalUrl" />
    <meta property="og:locale" :content="ogLocale" />
    <meta property="og:locale:alternate" content="hy_AM" />
    <meta property="og:locale:alternate" content="ru_RU" />
    <meta property="og:locale:alternate" content="en_US" />
    <link rel="canonical" :href="canonicalUrl" />
  </Head>
</template>
```

✅ **Structured Data (JSON-LD):**
- Building pages: `RealEstateListing` schema
- Article pages: `Article` schema
- Organization: `Organization` schema (site-wide)
- Breadcrumbs: `BreadcrumbList` schema

**Example Building Structured Data:**
```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Building Name",
  "description": "Building description",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Yerevan",
    "addressCountry": "AM"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 40.1811,
    "longitude": 44.5144
  },
  "offers": {
    "@type": "Offer",
    "price": "500000",
    "priceCurrency": "AMD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "500000",
      "priceCurrency": "AMD",
      "unitCode": "MTK"
    }
  }
}
```

✅ **Sitemap:**
- Generate dynamic sitemap: `sitemap.xml`
- Include: buildings, blog articles, static pages
- Per-language sitemaps (optional): `sitemap-am.xml`, `sitemap-ru.xml`, `sitemap-en.xml`
- Update frequency: daily for buildings, weekly for blog

**Implementation (`server/routes/sitemap.xml.ts`):**
```typescript
export default defineEventHandler(async (event) => {
  const buildings = await fetchAllBuildings() // Published only
  const articles = await fetchAllArticles() // Published only
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${buildings.map(b => `
    <url>
      <loc>https://example.com/buildings/${b.id}</loc>
      <lastmod>${b.updatedAt}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>
  `).join('')}
  ${articles.map(a => `
    <url>
      <loc>https://example.com/blog/${a.slug}</loc>
      <lastmod>${a.updatedAt}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
    </url>
  `).join('')}
</urlset>`

  event.node.res.setHeader('Content-Type', 'application/xml')
  return sitemap
})
```

✅ **Robots.txt:**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://example.com/sitemap.xml
```

✅ **Canonical URLs:**
- Every page has canonical URL
- Avoid duplicate content (e.g., `/buildings` vs `/buildings?page=1`)
- Use trailing slash consistently (or not, but be consistent)

✅ **hreflang Tags (Multi-Language):**
```vue
<Head>
  <link rel="alternate" hreflang="am" :href="`https://example.com${route.path}`" />
  <link rel="alternate" hreflang="ru" :href="`https://example.com/ru${route.path}`" />
  <link rel="alternate" hreflang="en" :href="`https://example.com/en${route.path}`" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/" />
</Head>
```

✅ **Pagination SEO:**
- Use `rel="prev"` and `rel="next"` for paginated pages
- Example: `<link rel="next" href="/buildings?page=2" />`

✅ **Image SEO:**
- Alt text for all images (multi-language)
- Image file names: descriptive (e.g., `building-yerevan-center-2024.jpg`)
- Use `<img>` with proper `alt` attribute (not just CSS backgrounds)

✅ **Performance (Core Web Vitals):**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

✅ **Mobile-First:**
- Responsive design (test on mobile devices)
- Touch-friendly buttons (min 44x44px)
- Fast mobile page load

✅ **HTTPS:**
- All pages served over HTTPS
- No mixed content warnings

✅ **Social Sharing:**
- Open Graph tags for Facebook, LinkedIn
- Twitter Card tags
- Proper image dimensions (1200x630px for OG images)

---

### 7.8 Performance Checklist

✅ **Lazy Loading:**
- **Images:** Use `<NuxtImg>` with `loading="lazy"` (Nuxt Image module)
- **Components:** Lazy load heavy components (map, gallery, calculator)
- **Routes:** Code splitting per route (automatic in Nuxt 3)
- **Third-party scripts:** Load analytics, ads asynchronously

**Example Lazy Loading:**
```vue
<template>
  <!-- Lazy load map component -->
  <LazyMapContainer v-if="showMap" :buildings="buildings" />
  
  <!-- Lazy load images -->
  <NuxtImg
    :src="building.primaryImage.url"
    :alt="building.primaryImage.altText"
    loading="lazy"
    placeholder
  />
</template>
```

✅ **Image Optimization:**
- Use `@nuxt/image` module
- Serve WebP format (with fallback)
- Responsive images (`srcset` for different screen sizes)
- Image CDN (MinIO or CloudFront) with automatic resizing
- Lazy load images below the fold

**Nuxt Image Configuration:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  image: {
    provider: 'ipx', // Or 'cloudinary', 'imgix', etc.
    domains: ['media.example.com'],
    formats: ['webp', 'avif'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536
    }
  }
})
```

✅ **Skeleton Loading States:**
- Show skeleton loaders while data loads
- Better UX than blank screens or spinners
- Match skeleton to actual content layout

**Example Skeleton:**
```vue
<template>
  <div v-if="loading" class="skeleton-grid">
    <div v-for="i in 12" :key="i" class="skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-text"></div>
    </div>
  </div>
  <div v-else>
    <BuildingCard v-for="building in buildings" :key="building.id" :building="building" />
  </div>
</template>
```

✅ **Caching Strategy:**
- **Static Pages:** Pre-render at build time (ISR or SSG)
- **API Responses:** Cache in Pinia store (in-memory)
- **Images:** Browser cache (Cache-Control headers)
- **Service Worker:** Optional PWA caching (Phase 2)

**Nuxt 3 Caching:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      routes: ['/buildings', '/blog'] // Pre-render at build
    }
  },
  routeRules: {
    '/buildings/**': { isr: 3600 }, // ISR: revalidate every hour
    '/blog/**': { isr: 86400 }, // ISR: revalidate daily
    '/': { prerender: true } // Pre-render homepage
  }
})
```

✅ **Code Splitting:**
- Automatic route-based code splitting (Nuxt 3)
- Lazy load heavy libraries (Leaflet, chart libraries)
- Tree-shaking unused code

✅ **Bundle Size Optimization:**
- Monitor bundle size (use `nuxt build --analyze`)
- Remove unused dependencies
- Use dynamic imports for large libraries
- **Target:** Initial bundle < 200KB (gzipped)

✅ **API Request Optimization:**
- Debounce search inputs (300ms)
- Batch analytics events (send every 5 seconds or on page unload)
- Use pagination (don't load all buildings at once)
- Cache API responses in Pinia (avoid duplicate requests)

✅ **Font Optimization:**
- Use `font-display: swap` for web fonts
- Preload critical fonts
- Subset fonts (only include needed characters)

✅ **Critical CSS:**
- Inline critical CSS in `<head>`
- Defer non-critical CSS
- Use `@nuxtjs/tailwindcss` with JIT mode (smaller CSS bundle)

✅ **Server-Side Rendering (SSR):**
- Pre-render HTML for SEO
- Hydrate on client (progressive enhancement)
- Use `useFetch` / `useAsyncData` for data fetching (automatic SSR)

✅ **Performance Monitoring:**
- Use Web Vitals (LCP, FID, CLS)
- Monitor with Google Analytics or custom analytics
- Set up performance budgets (Lighthouse CI)

**Performance Targets:**
- **LCP:** < 2.5s
- **FID:** < 100ms
- **CLS:** < 0.1
- **TTFB:** < 600ms
- **Bundle Size:** < 200KB (initial, gzipped)

---

### 7.9 Accessibility (A11y) Checklist

✅ **Semantic HTML:**
- Use proper HTML elements (`<nav>`, `<main>`, `<article>`, `<section>`)
- Proper heading hierarchy (`h1` → `h2` → `h3`)

✅ **ARIA Labels:**
- Add `aria-label` for icon-only buttons
- Use `aria-describedby` for form field descriptions
- `aria-live` regions for dynamic content updates

✅ **Keyboard Navigation:**
- All interactive elements focusable
- Logical tab order
- Skip links for main content

✅ **Screen Reader Support:**
- Alt text for images
- Descriptive link text (not "click here")
- Form labels associated with inputs

✅ **Color Contrast:**
- WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
- Don't rely solely on color for information

✅ **Focus Indicators:**
- Visible focus styles for keyboard navigation
- Don't remove `:focus` styles

---

### 7.10 Error Handling

**Error Boundaries:**
- Use `<ErrorBoundary>` component for graceful error handling
- Show user-friendly error messages
- Log errors to analytics service

**API Error Handling:**
```typescript
// composables/useApi.ts
export const useApi = () => {
  const handleError = (error: any) => {
    if (error.response) {
      // API error (4xx, 5xx)
      const status = error.response.status
      if (status === 404) {
        throw createError({ statusCode: 404, message: 'Not found' })
      } else if (status === 429) {
        // Rate limit
        showToast('Too many requests. Please try again later.')
      } else {
        showToast('An error occurred. Please try again.')
      }
    } else {
      // Network error
      showToast('Network error. Please check your connection.')
    }
  }

  return { handleError }
}
```

**404 Pages:**
- Custom 404 page (`pages/404.vue`)
- Helpful navigation links
- Search functionality

---

### 7.11 Testing Strategy (Frontend)

**Unit Tests:**
- Test composables (Vitest)
- Test utility functions
- Test Pinia stores

**Component Tests:**
- Test component rendering (Vue Test Utils)
- Test user interactions
- Test props/emits

**E2E Tests:**
- Test critical user flows (Playwright or Cypress)
- Test building search, detail page, favorites
- Test multi-language switching

**Visual Regression:**
- Screenshot testing for UI components (optional, Phase 2)

---

### 7.12 Development Workflow

**Local Development:**
- `npm run dev` → Start Nuxt dev server
- Hot module replacement (HMR) for fast iteration
- TypeScript type checking
- ESLint + Prettier for code quality

**Environment Variables:**
```
.env
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NUXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Build & Deploy:**
- `npm run build` → Production build
- `npm run preview` → Preview production build locally
- Deploy to VPS or hosting platform (Vercel, Netlify, etc.)

---

**ASSUMPTION:** Frontend and backend are deployed separately (frontend: static/SSR hosting, backend: VPS/container). API base URL configured via environment variable.

---

## 8) Repo Layout & Local Dev

### 8.1 Monorepo Tool Recommendation

**Decision: Use Nx**

**Rationale:**

| Criteria | Nx | Turborepo |
|----------|-----|-----------|
| **TypeScript Support** | ✅ Native, excellent | ✅ Good |
| **NestJS Integration** | ✅ Strong ecosystem | ⚠️ Works but less mature |
| **Caching** | ✅ Distributed caching, remote cache | ✅ Good local caching |
| **Code Generation** | ✅ Generators & plugins | ⚠️ Manual setup |
| **Dependency Graph** | ✅ Visual graph, affected detection | ✅ Basic graph |
| **Learning Curve** | ⚠️ Steeper (more features) | ✅ Simpler |
| **Community** | ✅ Large, active | ✅ Growing |
| **Microservices Support** | ✅ Excellent (service boundaries) | ✅ Good |

**Justification:**
- **NestJS Integration:** Nx has strong support for NestJS with generators for services, modules, and microservices patterns.
- **Service Boundaries:** Nx enforces clear boundaries between services via libraries/apps structure, which aligns with microservices-first mindset.
- **Code Generation:** Nx generators can scaffold new services consistently (DB migrations, OpenAPI contracts, event handlers).
- **Long-term Maintainability:** Better tooling for managing multiple services, shared libraries, and dependency management.

**ASSUMPTION:** Team is comfortable with TypeScript and modern tooling. If team prefers simplicity, Turborepo is acceptable alternative.

---

### 8.2 Repository Structure

**Monorepo Root Structure:**

```
new-building-portal/
├── .nx/                          # Nx cache
├── .github/                      # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── docker-compose.yml            # Local dev stack
├── docker-compose.prod.yml       # Production-like stack (optional)
├── nx.json                       # Nx configuration
├── package.json                  # Root package.json (workspace)
├── pnpm-workspace.yaml           # pnpm workspace config (or npm/yarn)
├── tsconfig.base.json            # Base TypeScript config
├── .env.example                  # Example environment variables
├── .env.local                    # Local overrides (gitignored)
├── .gitignore
├── README.md                     # This file
│
├── apps/                         # Applications (runnable services)
│   ├── api-gateway/              # API Gateway (NestJS)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── listings-service/         # Listings Service (NestJS)
│   │   ├── src/
│   │   ├── migrations/            # TypeORM migrations
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── search-service/           # Search Service (NestJS + Meilisearch)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── media-service/            # Media Service (NestJS + MinIO)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── content-service/          # Content Service (NestJS)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── analytics-service/        # Analytics Service (NestJS)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── image-processor/          # Image Processing Worker (NestJS)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                 # Nuxt 3 Frontend
│       ├── .nuxt/                # Generated (gitignored)
│       ├── .output/              # Build output (gitignored)
│       ├── assets/
│       ├── components/
│       ├── composables/
│       ├── layouts/
│       ├── middleware/
│       ├── pages/
│       ├── plugins/
│       ├── public/
│       ├── server/
│       ├── stores/
│       ├── nuxt.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── libs/                          # Shared libraries
│   ├── common/                   # Common utilities
│   │   ├── src/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── database/                 # Database utilities (PostGIS helpers)
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── events/                   # Event definitions & types
│   │   ├── src/
│   │   │   ├── building.events.ts
│   │   │   ├── media.events.ts
│   │   │   ├── analytics.events.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── contracts/                # OpenAPI contracts & types
│   │   ├── src/
│   │   │   ├── listings.api.ts
│   │   │   ├── search.api.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── nats-client/              # NATS client wrapper
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── observability/            # OpenTelemetry setup
│   │   ├── src/
│   │   │   ├── tracing.ts
│   │   │   ├── metrics.ts
│   │   │   └── logging.ts
│   │   └── package.json
│   │
│   └── validation/               # Shared validation schemas (Zod/Joi)
│       ├── src/
│       └── package.json
│
└── tools/                         # Development tools & scripts
    ├── seed/                      # Database seeding scripts
    │   ├── seed-buildings.ts
    │   ├── seed-developers.ts
    │   └── seed-blog.ts
    ├── migrations/                # Shared migration utilities
    └── scripts/                   # Helper scripts
        ├── setup-local.sh
        ├── generate-openapi.sh
        └── check-services.sh
```

**Key Principles:**
- **Apps:** Runnable applications (services, frontend, workers)
- **Libs:** Reusable code shared across services (no business logic, only utilities/contracts)
- **Tools:** Development-time scripts and utilities
- **Service Isolation:** Each service has its own `package.json`, `Dockerfile`, and database schema **(MVP:** schema-per-module in ONE shared Postgres instance; **Target:** DB-per-service with separate database instances)

---

### 8.3 Docker Compose Stack (Local Development)

**Note:** The docker-compose configuration below shows the **(Target)** architecture with separate PostgreSQL instances per service (DB-per-service). For **(MVP)**, use a single shared PostgreSQL instance with schema-per-module (see Section 2 for details).

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  # PostgreSQL with PostGIS (Target: DB-per-service)
  postgres-listings:
    image: postgis/postgis:15-3.3
    container_name: postgres-listings
    environment:
      POSTGRES_DB: listings_db
      POSTGRES_USER: listings_user
      POSTGRES_PASSWORD: listings_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres-listings-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U listings_user -d listings_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  postgres-content:
    image: postgis/postgis:15-3.3
    container_name: postgres-content
    environment:
      POSTGRES_DB: content_db
      POSTGRES_USER: content_user
      POSTGRES_PASSWORD: content_pass
    ports:
      - "5433:5432"
    volumes:
      - postgres-content-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U content_user -d content_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  postgres-analytics:
    image: postgis/postgis:15-3.3
    container_name: postgres-analytics
    environment:
      POSTGRES_DB: analytics_db
      POSTGRES_USER: analytics_user
      POSTGRES_PASSWORD: analytics_pass
    ports:
      - "5434:5432"
    volumes:
      - postgres-analytics-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U analytics_user -d analytics_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis (Cache + Rate Limiting)
  redis:
    image: redis:7-alpine
    container_name: redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # NATS JetStream
  nats:
    image: nats:2.10-alpine
    container_name: nats-dev
    ports:
      - "4222:4222"  # Client connections
      - "8222:8222"  # HTTP monitoring
      - "6222:6222"  # Cluster routing
    command:
      - "-js"              # Enable JetStream
      - "-m"               # Enable monitoring
      - "8222"
      - "-store_dir"       # JetStream store directory
      - "/data/jetstream"
    volumes:
      - nats-data:/data
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8222/healthz"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Meilisearch
  meilisearch:
    image: getmeili/meilisearch:v1.5
    container_name: meilisearch-dev
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: dev_master_key_change_in_prod
      MEILI_ENV: development
    volumes:
      - meilisearch-data:/meili_data
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:7700/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:latest
    container_name: minio-dev
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO Client (for bucket setup)
  minio-setup:
    image: minio/mc:latest
    container_name: minio-setup
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      sleep 5;
      /usr/bin/mc alias set myminio http://minio:9000 minioadmin minioadmin;
      /usr/bin/mc mb myminio/buildings-media --ignore-existing;
      /usr/bin/mc mb myminio/blog-media --ignore-existing;
      /usr/bin/mc anonymous set download myminio/buildings-media;
      /usr/bin/mc anonymous set download myminio/blog-media;
      exit 0;
      "

  # Prometheus (Metrics)
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus-dev
    ports:
      - "9090:9090"
    volumes:
      - ./tools/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana (Dashboards)
  grafana:
    image: grafana/grafana:latest
    container_name: grafana-dev
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./tools/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./tools/grafana/datasources:/etc/grafana/provisioning/datasources

  # Loki (Logs)
  loki:
    image: grafana/loki:latest
    container_name: loki-dev
    ports:
      - "3100:3100"
    volumes:
      - ./tools/loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki

  # Tempo (Traces)
  tempo:
    image: grafana/tempo:latest
    container_name: tempo-dev
    ports:
      - "3200:3200"  # Tempo
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP
    volumes:
      - tempo-data:/var/tempo
    command: ["-config.file=/etc/tempo/tempo.yml"]

volumes:
  postgres-listings-data:
  postgres-content-data:
  postgres-analytics-data:
  redis-data:
  nats-data:
  meilisearch-data:
  minio-data:
  prometheus-data:
  grafana-data:
  loki-data:
  tempo-data:
```

**Usage:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

**ASSUMPTION:** All services use default ports. If port conflicts occur, adjust ports in `docker-compose.yml` and update environment variables accordingly.

---

### 8.4 Environment Variables

**Environment Variables Table:**

| Variable | Service/App | Description | Example | Required |
|----------|-------------|-------------|---------|----------|
| **Database (Listings Service) (Target: DB-per-service; MVP: shared Postgres with `listings` schema)** |
| `LISTINGS_DB_HOST` | listings-service | PostgreSQL host | `localhost` | ✅ |
| `LISTINGS_DB_PORT` | listings-service | PostgreSQL port | `5432` | ✅ |
| `LISTINGS_DB_NAME` | listings-service | Database name | `listings_db` **(Target)** or shared DB name **(MVP)** | ✅ |
| `LISTINGS_DB_USER` | listings-service | Database user | `listings_user` | ✅ |
| `LISTINGS_DB_PASSWORD` | listings-service | Database password | `listings_pass` | ✅ |
| **Database (Content Service) (Target: DB-per-service; MVP: shared Postgres with `content` schema)** |
| `CONTENT_DB_HOST` | content-service | PostgreSQL host | `localhost` | ✅ |
| `CONTENT_DB_PORT` | content-service | PostgreSQL port | `5433` **(Target)** or same as Listings port **(MVP)** | ✅ |
| `CONTENT_DB_NAME` | content-service | Database name | `content_db` **(Target)** or shared DB name **(MVP)** | ✅ |
| `CONTENT_DB_USER` | content-service | Database user | `content_user` | ✅ |
| `CONTENT_DB_PASSWORD` | content-service | Database password | `content_pass` | ✅ |
| **Database (Analytics Service) (Target: DB-per-service; MVP: shared Postgres with `analytics` schema)** |
| `ANALYTICS_DB_HOST` | analytics-service | PostgreSQL host | `localhost` | ✅ |
| `ANALYTICS_DB_PORT` | analytics-service | PostgreSQL port | `5434` **(Target)** or same as Listings port **(MVP)** | ✅ |
| `ANALYTICS_DB_NAME` | analytics-service | Database name | `analytics_db` **(Target)** or shared DB name **(MVP)** | ✅ |
| `ANALYTICS_DB_USER` | analytics-service | Database user | `analytics_user` | ✅ |
| `ANALYTICS_DB_PASSWORD` | analytics-service | Database password | `analytics_pass` | ✅ |
| **Redis** |
| `REDIS_HOST` | All services | Redis host | `localhost` | ✅ |
| `REDIS_PORT` | All services | Redis port | `6379` | ✅ |
| `REDIS_PASSWORD` | All services | Redis password (if set) | - | ❌ |
| **NATS** |
| `NATS_URL` | All services | NATS connection URL | `nats://localhost:4222` | ✅ |
| `NATS_JETSTREAM_ENABLED` | All services | Enable JetStream | `true` | ✅ |
| **Meilisearch** |
| `MEILISEARCH_HOST` | search-service | Meilisearch host | `http://localhost:7700` | ✅ |
| `MEILISEARCH_MASTER_KEY` | search-service | Meilisearch master key | `dev_master_key` | ✅ |
| **MinIO** |
| `MINIO_ENDPOINT` | media-service | MinIO endpoint | `localhost:9000` | ✅ |
| `MINIO_ACCESS_KEY` | media-service | MinIO access key | `minioadmin` | ✅ |
| `MINIO_SECRET_KEY` | media-service | MinIO secret key | `minioadmin` | ✅ |
| `MINIO_USE_SSL` | media-service | Use SSL | `false` | ✅ |
| `MINIO_BUCKET_BUILDINGS` | media-service | Buildings media bucket | `buildings-media` | ✅ |
| `MINIO_BUCKET_BLOG` | media-service | Blog media bucket | `blog-media` | ✅ |
| **Observability** |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | All services | OTLP endpoint | `http://localhost:4318` | ✅ |
| `OTEL_SERVICE_NAME` | All services | Service name for traces | `listings-service` | ✅ |
| `OTEL_ENABLED` | All services | Enable OpenTelemetry | `true` | ✅ |
| **API Gateway** |
| `API_GATEWAY_PORT` | api-gateway | Gateway port | `3000` | ✅ |
| `API_GATEWAY_CORS_ORIGIN` | api-gateway | Allowed CORS origins | `http://localhost:3001` | ✅ |
| `LISTINGS_SERVICE_URL` | api-gateway | Listings service URL | `http://localhost:3001` | ✅ |
| `SEARCH_SERVICE_URL` | api-gateway | Search service URL | `http://localhost:3002` | ✅ |
| `MEDIA_SERVICE_URL` | api-gateway | Media service URL | `http://localhost:3003` | ✅ |
| `CONTENT_SERVICE_URL` | api-gateway | Content service URL | `http://localhost:3004` | ✅ |
| `ANALYTICS_SERVICE_URL` | api-gateway | Analytics service URL | `http://localhost:3005` | ✅ |
| **Services (Ports)** |
| `LISTINGS_SERVICE_PORT` | listings-service | Service port | `3001` | ✅ |
| `SEARCH_SERVICE_PORT` | search-service | Service port | `3002` | ✅ |
| `MEDIA_SERVICE_PORT` | media-service | Service port | `3003` | ✅ |
| `CONTENT_SERVICE_PORT` | content-service | Service port | `3004` | ✅ |
| `ANALYTICS_SERVICE_PORT` | analytics-service | Service port | `3005` | ✅ |
| `IMAGE_PROCESSOR_PORT` | image-processor | Worker port | `3006` | ✅ |
| **Security** |
| `JWT_SECRET` | api-gateway, services | JWT signing secret | `change-in-prod` | ✅ |
| `JWT_EXPIRES_IN` | api-gateway, services | JWT expiration | `1h` | ✅ |
| `ADMIN_API_KEY` | api-gateway | Admin API key (for admin endpoints) | `change-in-prod` | ✅ |
| `RATE_LIMIT_TTL` | api-gateway | Rate limit window (seconds) | `60` | ✅ |
| `RATE_LIMIT_MAX` | api-gateway | Max requests per window | `100` | ✅ |
| **Frontend** |
| `NUXT_PUBLIC_API_BASE_URL` | frontend | API base URL | `http://localhost:3000/api` | ✅ |
| `NUXT_PUBLIC_MAP_TILE_URL` | frontend | Map tile URL | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | ✅ |
| `NUXT_PUBLIC_MAP_ATTRIBUTION` | frontend | Map attribution | `© OpenStreetMap` | ✅ |
| **Environment** |
| `NODE_ENV` | All services | Environment | `development` / `production` | ✅ |
| `LOG_LEVEL` | All services | Log level | `debug` / `info` / `warn` / `error` | ✅ |

**Environment Files:**

- `.env.example` - Template with all variables (committed to git)
- `.env.local` - Local overrides (gitignored)
- `.env.{service}` - Service-specific overrides (optional)

**ASSUMPTION:** Use `dotenv` or `@nestjs/config` to load environment variables. Secrets should be injected via environment variables or secret management (not hardcoded).

---

### 8.5 Local Development Setup

**Prerequisites:**
- Node.js 18+ (LTS)
- pnpm 8+ (or npm/yarn)
- Docker & Docker Compose
- Git

**Initial Setup:**

```bash
# 1. Clone repository
git clone <repo-url>
cd new-building-portal

# 2. Install dependencies (root + all workspaces)
pnpm install

# 3. Start infrastructure services (PostgreSQL, Redis, NATS, etc.)
docker-compose up -d

# 4. Wait for services to be healthy
docker-compose ps

# 5. Run database migrations (for each service)
pnpm nx run listings-service:migrate
pnpm nx run content-service:migrate
pnpm nx run analytics-service:migrate

# 6. Seed database (optional)
pnpm nx run tools:seed

# 7. Start all services in development mode
pnpm nx run-many --target=serve --projects=api-gateway,listings-service,search-service,media-service,content-service,analytics-service --parallel=6

# 8. Start frontend (in separate terminal)
pnpm nx serve frontend

# 9. Access services:
# - Frontend: http://localhost:3001
# - API Gateway: http://localhost:3000
# - Grafana: http://localhost:3001 (admin/admin)
# - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
# - Meilisearch: http://localhost:7700
```

**Nx Commands:**

```bash
# Run a specific service
pnpm nx serve listings-service

# Run tests for a service
pnpm nx test listings-service

# Build a service
pnpm nx build listings-service

# Run linting
pnpm nx lint listings-service

# Generate a new service
pnpm nx generate @nx/nest:application auth-service

# Generate a library
pnpm nx generate @nx/node:library events

# View dependency graph
pnpm nx graph

# Run affected commands (only changed services)
pnpm nx affected:test
pnpm nx affected:build
```

**Hot Reload:**
- NestJS services: Use `nest start --watch` (configured in `project.json`)
- Nuxt frontend: Automatic HMR via Vite

**Database Migrations:**

```bash
# Generate migration (TypeORM example)
pnpm nx run listings-service:typeorm -- migration:generate -n AddBuildingFields

# Run migrations
pnpm nx run listings-service:typeorm -- migration:run

# Revert migration
pnpm nx run listings-service:typeorm -- migration:revert
```

**ASSUMPTION:** Each service/module manages its own migrations using TypeORM (consistent across all services).

---

### 8.6 Database Seeding Strategy

**Purpose:**
- Populate development database with realistic test data
- Enable local testing without manual data entry
- Support demo environments

**Seed Scripts Location:**
```
tools/seed/
├── seed-buildings.ts      # Seed buildings, developers, regions
├── seed-developers.ts     # Seed developers
├── seed-blog.ts           # Seed blog articles
└── seed-all.ts            # Run all seed scripts
```

**Seed Data Structure:**

```typescript
// tools/seed/seed-buildings.ts
import { DataSource } from 'typeorm';
import { Building, Developer, Region } from '@new-building-portal/listings-service';

export async function seedBuildings(dataSource: DataSource) {
  const buildingRepo = dataSource.getRepository(Building);
  const developerRepo = dataSource.getRepository(Developer);
  const regionRepo = dataSource.getRepository(Region);

  // Seed regions
  const regions = [
    { nameHy: 'Երևան', nameRu: 'Ереван', nameEn: 'Yerevan', slug: 'yerevan' },
    { nameHy: 'Գյումրի', nameRu: 'Гюмри', nameEn: 'Gyumri', slug: 'gyumri' },
    // ... more regions
  ];

  // Seed developers
  const developers = [
    { name: 'Developer A', website: 'https://example.com', logoUrl: '...' },
    // ... more developers
  ];

  // Seed buildings
  const buildings = [
    {
      titleHy: 'Նոր Բնակարանային Համալիր',
      titleRu: 'Новый Жилой Комплекс',
      titleEn: 'New Residential Complex',
      address: 'Yerevan, Armenia',
      location: { type: 'Point', coordinates: [44.5133, 40.1811] }, // PostGIS
      pricePerM2Min: 500000,
      pricePerM2Max: 800000,
      priceFrom: 25000000,
      areaFrom: 50,
      floors: 10,
      commissioningDate: new Date('2025-12-31'),
      developerId: 1,
      regionId: 1,
      // ... more fields
    },
    // ... more buildings
  ];

  // Insert data
  await regionRepo.save(regions);
  await developerRepo.save(developers);
  await buildingRepo.save(buildings);
}
```

**Usage:**

```bash
# Seed all data
pnpm nx run tools:seed

# Seed specific data
pnpm nx run tools:seed-buildings
pnpm nx run tools:seed-blog
```

**Seed Data Guidelines:**
- **Realistic Data:** Use realistic Armenian addresses, names, prices
- **Multi-language:** Include Armenian (hy), Russian (ru), English (en) text
- **Relationships:** Maintain referential integrity (buildings → developers, regions)
- **PostGIS:** Use valid coordinates for Armenia (latitude ~40, longitude ~44-45)
- **Images:** Use placeholder images or sample images (not copyrighted)
- **Idempotency:** Seed scripts should be idempotent (can run multiple times safely)

**ASSUMPTION:** Seed scripts are development-only. Production databases are never seeded automatically.

---

### 8.7 Development Workflow

**Daily Workflow:**

1. **Start Infrastructure:**
   ```bash
   docker-compose up -d
   ```

2. **Start Services:**
   ```bash
   pnpm nx run-many --target=serve --all --parallel
   ```

3. **Make Changes:**
   - Edit code in service or frontend
   - Hot reload automatically applies changes

4. **Run Tests:**
   ```bash
   pnpm nx test <service-name>
   ```

5. **Check Linting:**
   ```bash
   pnpm nx lint <service-name>
   ```

**Code Generation (Nx):**

```bash
# Generate NestJS module
pnpm nx generate @nx/nest:module buildings --project=listings-service

# Generate controller
pnpm nx generate @nx/nest:controller buildings --project=listings-service

# Generate service
pnpm nx generate @nx/nest:service buildings --project=listings-service

# Generate DTO
pnpm nx generate @nx/nest:class dto create-building.dto --project=listings-service
```

**Debugging:**

- **NestJS Services:** Use VS Code debugger with `.vscode/launch.json`
- **Frontend:** Use browser DevTools + Vue DevTools extension
- **Database:** Use pgAdmin or DBeaver to inspect PostgreSQL
- **NATS:** Use NATS CLI (`nats stream ls`) to inspect streams
- **Redis:** Use Redis CLI (`redis-cli`) or RedisInsight

**ASSUMPTION:** Developers use VS Code or similar IDE with TypeScript support and debugging capabilities.

---

### 8.8 Troubleshooting

**Common Issues:**

| Issue | Solution |
|-------|----------|
| **Port already in use** | Change port in `docker-compose.yml` or service config |
| **Database connection failed** | Check `docker-compose ps`, ensure PostgreSQL is healthy |
| **NATS connection failed** | Verify NATS is running: `docker-compose logs nats` |
| **Meilisearch not indexing** | Check Meilisearch logs: `docker-compose logs meilisearch` |
| **MinIO bucket not found** | Run `minio-setup` service or create buckets manually |
| **Migration fails** | Check database schema, ensure previous migrations ran |
| **Hot reload not working** | Restart service manually: `pnpm nx serve <service>` |
| **Type errors** | Run `pnpm nx run-many --target=typecheck --all` |

**Health Checks:**

```bash
# Check all services health
curl http://localhost:3000/health
curl http://localhost:3001/health  # listings-service
curl http://localhost:3002/health  # search-service
# ... etc

# Check infrastructure
docker-compose ps
curl http://localhost:7700/health  # Meilisearch
curl http://localhost:9000/minio/health/live  # MinIO
```

**Logs:**

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f nats
docker-compose logs -f postgres-listings

# View application logs (if using file logging)
tail -f logs/listings-service.log
```

---

**ASSUMPTION:** All services implement `/health` endpoint for health checks. Infrastructure services (PostgreSQL, Redis, NATS) have health checks configured in `docker-compose.yml`.

---

## 9) CI/CD & Deployment

### 9.1 CI/CD Strategy Overview

**Decision: GitHub Actions for CI/CD**

**Rationale:**
- **Integration:** Native GitHub integration, no external service required
- **Cost:** Free for public repos, reasonable pricing for private repos
- **Flexibility:** Supports complex workflows, matrix builds, parallel jobs
- **Docker Support:** Native Docker build and push to registries
- **Secrets Management:** GitHub Secrets for secure credential storage

**Alternative Considered:** GitLab CI/CD, Jenkins, CircleCI
- **ASSUMPTION:** Project uses GitHub for version control. If using GitLab, adapt workflows to GitLab CI/CD syntax.

**CI/CD Principles:**
1. **Fail Fast:** Run fast checks (lint, typecheck, unit tests) before slow checks (integration tests, builds)
2. **Parallel Execution:** Run tests for different services in parallel
3. **Caching:** Cache dependencies (node_modules, Docker layers) to speed up builds
4. **Artifact Management:** Store build artifacts (Docker images, OpenAPI specs) for deployment
5. **Environment Parity:** Use same Docker images in all environments (dev/stage/prod)
6. **Immutable Deployments:** Tag images with commit SHA, never reuse tags

---

### 9.2 Docker Build Strategy

**Multi-Stage Dockerfiles:**

Each service should use multi-stage builds to minimize image size and improve security.

**Example: NestJS Service Dockerfile (`apps/listings-service/Dockerfile`):**

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm nx build listings-service --prod

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/listings-service ./
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
EXPOSE 3001
CMD ["node", "main.js"]
```

**Example: Nuxt 3 Frontend Dockerfile (`apps/frontend/Dockerfile`):**

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NUXT_PUBLIC_API_URL=${NUXT_PUBLIC_API_URL}
RUN pnpm nx build frontend

# Stage 3: Runtime (Node.js server for SSR)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs
COPY --from=builder --chown=nuxtjs:nodejs /app/apps/frontend/.output ./
USER nuxtjs
EXPOSE 3000
CMD ["node", "server/index.mjs"]
```

**Docker Build Arguments:**

| Argument | Purpose | Example |
|----------|---------|---------|
| `BUILDKIT_INLINE_CACHE` | Enable layer caching | `1` |
| `DOCKER_BUILDKIT` | Use BuildKit for faster builds | `1` |
| `IMAGE_TAG` | Tag for image (commit SHA or semver) | `abc123` or `v1.0.0` |
| `REGISTRY` | Docker registry URL | `ghcr.io/org/repo` |

**Docker Image Tagging Strategy:**

| Tag Pattern | Purpose | Example |
|-------------|---------|---------|
| `{service}:{commit-sha}` | Immutable, per-commit | `listings-service:abc123def` |
| `{service}:{branch-name}` | Latest for branch | `listings-service:main`, `listings-service:develop` |
| `{service}:v{semver}` | Release tags | `listings-service:v1.0.0` |
| `{service}:latest` | Latest stable (production only) | `listings-service:latest` |

**ASSUMPTION:** Docker registry is GitHub Container Registry (ghcr.io) or Docker Hub. For production, consider private registry (AWS ECR, Azure ACR, GCR).

**Docker Compose for Production:**

Create `docker-compose.prod.yml` for production-like local testing:

```yaml
version: '3.8'

services:
  api-gateway:
    image: ${REGISTRY}/api-gateway:${IMAGE_TAG}
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NATS_URL=${NATS_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres-listings
      - nats

  listings-service:
    image: ${REGISTRY}/listings-service:${IMAGE_TAG}
    environment:
      - DATABASE_URL=${DATABASE_URL_LISTINGS}
      - NATS_URL=${NATS_URL}
    depends_on:
      - postgres-listings
      - nats

  # ... other services
```

---

### 9.3 Database Migrations Strategy

**Per-Service Migrations:**

Each service owns its database and migrations. Migrations are versioned and run as part of deployment.

**Migration Tools:**

| Service | Migration Tool | Rationale |
|---------|---------------|-----------|
| **Listings Service** | TypeORM Migrations | Native NestJS integration, supports PostGIS |
| **Content Service** | TypeORM Migrations | Same as above |
| **Analytics Service** | TypeORM Migrations | Same as above |
| **Auth Service** | TypeORM Migrations | Same as above |

**Migration Workflow:**

1. **Development:**
   ```bash
   # Generate migration
   pnpm nx run listings-service:migration:generate --name AddPriceSnapshotTable
   
   # Run migration locally
   pnpm nx run listings-service:migration:run
   
   # Revert migration (if needed)
   pnpm nx run listings-service:migration:revert
   ```

2. **CI Pipeline:**
   - Run migrations in test database before running integration tests
   - Validate migration files (syntax, no breaking changes in dev)

3. **Deployment:**
   - Run migrations as part of deployment process (before starting new service version)
   - Use migration tool's transaction support (rollback on failure)
   - **Never run migrations manually in production** (automated only)

**Migration Best Practices:**

| Practice | Description |
|----------|-------------|
| **Idempotent Migrations** | Migrations should be safe to run multiple times (use `IF NOT EXISTS`, `IF EXISTS`) |
| **Backward Compatible** | Avoid breaking changes in migrations (add columns as nullable first, then populate, then make required) |
| **Test Migrations** | Test migrations on copy of production data before deploying |
| **Migration Locking** | Use advisory locks to prevent concurrent migration runs |
| **Rollback Plan** | Always have rollback migration ready (or document manual rollback steps) |

**Migration Script Example (`apps/listings-service/src/migrations/1234567890-AddPriceSnapshotTable.ts`):**

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddPriceSnapshotTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'price_snapshots',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'buildingId',
            type: 'int',
          },
          {
            name: 'pricePerM2Min',
            type: 'int',
          },
          {
            name: 'pricePerM2Max',
            type: 'int',
          },
          {
            name: 'snapshotDate',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['buildingId'],
            referencedTableName: 'buildings',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            columnNames: ['buildingId', 'snapshotDate'],
          },
        ],
      }),
      true, // ifNotExists
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('price_snapshots', true, true, true);
  }
}
```

**ASSUMPTION:** Migrations are run automatically during deployment. For zero-downtime deployments, consider running migrations in a separate step before deployment (blue-green or canary).

---

### 9.4 CI Pipeline (GitHub Actions)

**Workflow Structure:**

| Workflow File | Trigger | Purpose |
|---------------|---------|---------|
| `.github/workflows/ci.yml` | Push to any branch, PR | Run tests, lint, typecheck, build |
| `.github/workflows/cd-dev.yml` | Push to `develop` | Deploy to development environment |
| `.github/workflows/cd-stage.yml` | Push to `release/*` or manual | Deploy to staging environment |
| `.github/workflows/cd-prod.yml` | Push to `main` or manual | Deploy to production environment |

**CI Workflow (`.github/workflows/ci.yml`):**

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: ['main', 'develop']

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  # Job 1: Lint and Typecheck (fast, runs first)
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm nx run-many --target=lint --all --parallel
      
      - name: Typecheck
        run: pnpm nx run-many --target=typecheck --all --parallel

  # Job 2: Unit Tests (parallel per service)
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - api-gateway
          - listings-service
          - search-service
          - media-service
          - content-service
          - analytics-service
          - image-processor
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: pnpm nx test ${{ matrix.service }} --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/${{ matrix.service }}/coverage-final.json
          flags: ${{ matrix.service }}

  # Job 3: Integration Tests (requires infrastructure)
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres-listings:
        image: postgis/postgis:15-3.3
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: listings_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
      
      nats:
        image: nats:2.10-alpine
        options: >-
          --health-cmd "nats server check"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 4222:4222
          - 8222:8222
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run migrations
        run: pnpm nx run listings-service:migration:run
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/listings_test
      
      - name: Run integration tests
        run: pnpm nx run-many --target=test:integration --all
        env:
          DATABASE_URL_LISTINGS: postgresql://postgres:test@localhost:5432/listings_test
          REDIS_URL: redis://localhost:6379
          NATS_URL: nats://localhost:4222

  # Job 4: Build Docker Images
  build-images:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, unit-tests]
    if: github.event_name == 'push'
    strategy:
      matrix:
        service:
          - api-gateway
          - listings-service
          - search-service
          - media-service
          - content-service
          - analytics-service
          - image-processor
          - frontend
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/${{ matrix.service }}
          tags: |
            type=sha,prefix={{branch}}-
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/${{ matrix.service }}/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILDKIT_INLINE_CACHE=1

  # Job 5: Generate OpenAPI Specs
  generate-openapi:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Generate OpenAPI specs
        run: pnpm nx run-many --target=openapi:generate --all
      
      - name: Upload OpenAPI specs
        uses: actions/upload-artifact@v3
        with:
          name: openapi-specs
          path: apps/*/openapi.json
          retention-days: 30
```

**CI Pipeline Checklist:**

- [ ] **Fast Feedback:** Lint and typecheck run first (< 2 minutes)
- [ ] **Parallel Execution:** Unit tests run in parallel per service
- [ ] **Infrastructure for Integration Tests:** Docker services (PostgreSQL, Redis, NATS) available in CI
- [ ] **Docker Caching:** Use GitHub Actions cache for Docker layers
- [ ] **Artifact Storage:** OpenAPI specs stored as artifacts
- [ ] **Conditional Builds:** Only build Docker images on push (not PR)
- [ ] **Matrix Strategy:** Test all services in parallel

**ASSUMPTION:** GitHub Actions runners have sufficient resources (CPU, memory) for parallel test execution. If using self-hosted runners, adjust concurrency limits.

---

### 9.5 CD Pipeline (Deployment)

**Deployment Strategy: Blue-Green or Rolling Update**

| Strategy | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Blue-Green** | Zero downtime, easy rollback | Requires 2x resources | Production |
| **Rolling Update** | Resource efficient | Brief service interruption possible | Staging, Development |
| **Canary** | Gradual rollout, risk mitigation | Complex setup | Production (optional) |

**ASSUMPTION:** For MVP, use rolling updates. For production at scale, consider blue-green or canary.

**CD Workflow for Development (`.github/workflows/cd-dev.yml`):**

```yaml
name: CD - Development

on:
  push:
    branches: ['develop']
  workflow_dispatch:

env:
  ENVIRONMENT: development
  REGISTRY: ghcr.io
  IMAGE_TAG: ${{ github.sha }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Development
        run: |
          echo "Deploying to development environment"
          # Example: SSH to server and run deployment script
          # ssh user@dev-server "cd /app && ./deploy.sh ${{ env.IMAGE_TAG }}"
          # Or use kubectl, terraform, etc.
      
      - name: Run migrations
        run: |
          # Run migrations for each service
          # pnpm nx run listings-service:migration:run --env=development
      
      - name: Health check
        run: |
          # Wait for services to be healthy
          # curl -f http://dev-api.example.com/health || exit 1
```

**CD Workflow for Production (`.github/workflows/cd-prod.yml`):**

```yaml
name: CD - Production

on:
  push:
    branches: ['main']
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      image_tag:
        description: 'Image tag to deploy'
        required: true

env:
  ENVIRONMENT: production
  REGISTRY: ghcr.io

jobs:
  pre-deployment-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check migration status
        run: |
          # Verify all migrations are applied
          # pnpm nx run listings-service:migration:show --env=production
      
      - name: Run smoke tests
        run: |
          # Run critical path tests against staging
          # pnpm nx run e2e:smoke

  deploy:
    runs-on: ubuntu-latest
    needs: [pre-deployment-checks]
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Set image tag
        id: image_tag
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            echo "tag=${{ github.event.inputs.image_tag }}" >> $GITHUB_OUTPUT
          elif [ -n "${{ github.ref }}" ] && [[ "${{ github.ref }}" == refs/tags/* ]]; then
            echo "tag=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT
          else
            echo "tag=${{ github.sha }}" >> $GITHUB_OUTPUT
          fi
      
      - name: Deploy to Production
        run: |
          echo "Deploying ${{ steps.image_tag.outputs.tag }} to production"
          # Deployment logic here
      
      - name: Run migrations
        run: |
          # Run migrations (with rollback plan)
          # pnpm nx run listings-service:migration:run --env=production
      
      - name: Health check
        run: |
          # Wait for services to be healthy
          # curl -f https://api.example.com/health || exit 1
      
      - name: Post-deployment verification
        run: |
          # Run smoke tests against production
          # pnpm nx run e2e:smoke --env=production
      
      - name: Notify on failure
        if: failure()
        run: |
          # Send alert (Slack, email, PagerDuty)
          # curl -X POST ${{ secrets.SLACK_WEBHOOK }} -d '{"text":"Deployment failed"}'
```

**Deployment Checklist:**

- [ ] **Pre-deployment:** Run migrations, smoke tests, verify image tags
- [ ] **Deployment:** Deploy services in order (infrastructure → services → gateway → frontend)
- [ ] **Post-deployment:** Health checks, smoke tests, monitoring alerts
- [ ] **Rollback Plan:** Document rollback steps (revert to previous image tag, rollback migrations if needed)

---

### 9.6 Environments

**Environment Configuration:**

| Environment | Purpose | URL Pattern | Database | Auto-Deploy |
|-------------|---------|-------------|----------|-------------|
| **Development** | Local dev, feature testing | `dev-api.example.com` | Shared dev DB | On push to `develop` |
| **Staging** | Pre-production testing | `stage-api.example.com` | Staging DB (prod-like) | On push to `release/*` |
| **Production** | Live production | `api.example.com` | Production DB | On push to `main` or manual |

**Environment Variables per Environment:**

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `LOG_LEVEL` | `debug` | `info` | `warn` |
| `DATABASE_URL` | Dev DB (shared) | Staging DB | Production DB |
| `REDIS_URL` | Dev Redis | Staging Redis | Production Redis |
| `NATS_URL` | Dev NATS | Staging NATS | Production NATS |
| `MEILISEARCH_URL` | Dev Meilisearch | Staging Meilisearch | Production Meilisearch |
| `MINIO_ENDPOINT` | Dev MinIO | Staging MinIO | Production MinIO |
| `CORS_ORIGIN` | `http://localhost:3000` | `https://stage.example.com` | `https://example.com` |
| `RATE_LIMIT_TTL` | `60` (relaxed) | `60` | `60` |
| `RATE_LIMIT_MAX` | `1000` (relaxed) | `100` | `100` |

**ASSUMPTION:** Each environment has isolated infrastructure (databases, Redis, NATS, MinIO). For cost savings in development, some services can be shared (e.g., single Redis instance for all dev services).

---

### 9.7 Deployment Targets

**Option A: Kubernetes (Recommended for Production)**

**Kubernetes Architecture:**

```
┌─────────────────────────────────────────────────┐
│              Ingress (NGINX/Traefik)            │
│         TLS Termination, Routing                │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼──────┐ ┌───▼──────┐
│ API Gateway  │ │ Frontend │ │ (Other)   │
│   Service    │ │  Service │ │           │
└───────┬──────┘ └──────────┘ └───────────┘
        │
┌───────▼─────────────────────────────────────────┐
│         Backend Services (NestJS)               │
│  Listings │ Search │ Media │ Content │ Analytics│
└───────┬─────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────┐
│         Infrastructure (StatefulSets)           │
│  PostgreSQL │ Redis │ NATS │ MinIO │ Meilisearch│
└─────────────────────────────────────────────────┘
```

**Kubernetes Manifests Structure:**

```
k8s/
├── base/                          # Base manifests (Kustomize)
│   ├── api-gateway/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── configmap.yaml
│   ├── listings-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── configmap.yaml
│   └── ...
├── overlays/
│   ├── development/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   └── production/
│       ├── kustomization.yaml
│       └── patches/
├── infrastructure/
│   ├── postgres/
│   │   ├── statefulset.yaml
│   │   ├── service.yaml
│   │   └── pvc.yaml
│   ├── redis/
│   │   ├── statefulset.yaml
│   │   └── service.yaml
│   └── ...
└── ingress/
    ├── ingress.yaml
    └── cert-manager.yaml
```

**Example Deployment Manifest (`k8s/base/listings-service/deployment.yaml`):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: listings-service
  labels:
    app: listings-service
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: listings-service
  template:
    metadata:
      labels:
        app: listings-service
        version: v1
    spec:
      containers:
      - name: listings-service
        image: ghcr.io/org/repo/listings-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: listings-service-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: listings-service-secrets
              key: DATABASE_URL
        - name: NATS_URL
          valueFrom:
            secretKeyRef:
              name: shared-secrets
              key: NATS_URL
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: listings-service
spec:
  selector:
    app: listings-service
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

**Kubernetes Deployment Steps:**

1. **Setup Cluster:** Provision Kubernetes cluster (EKS, GKE, AKS, or self-hosted)
2. **Install Ingress:** Install NGINX Ingress Controller or Traefik
3. **Install Cert-Manager:** For TLS certificates (Let's Encrypt)
4. **Create Namespaces:** `development`, `staging`, `production`
5. **Deploy Infrastructure:** PostgreSQL, Redis, NATS, MinIO, Meilisearch (StatefulSets with PVCs)
6. **Deploy Services:** Deploy backend services and frontend
7. **Configure Ingress:** Set up routing and TLS

**ASSUMPTION:** Kubernetes cluster is managed (EKS, GKE, AKS) or self-hosted with sufficient resources. For smaller deployments, consider managed Kubernetes services.

---

**Option B: VPS Deployment (Simpler Alternative)**

**VPS Architecture:**

```
┌─────────────────────────────────────────┐
│         NGINX (Reverse Proxy)            │
│      TLS, Static Files, Routing         │
└─────────────────────────────────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌──▼───┐ ┌───▼───┐
│Frontend│ │Gateway│ │(Other)│
│(PM2)   │ │(PM2) │ │(PM2)  │
└────────┘ └──────┘ └───────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌──▼───┐ ┌───▼───┐
│Listings│ │Search│ │Media  │
│(PM2)   │ │(PM2) │ │(PM2)  │
└────────┘ └──────┘ └───────┘
```

**VPS Deployment Script (`scripts/deploy-vps.sh`):**

```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-production}
IMAGE_TAG=${2:-latest}
REGISTRY=${REGISTRY:-ghcr.io/org/repo}

echo "Deploying to $ENVIRONMENT with tag $IMAGE_TAG"

# Pull latest images
docker pull $REGISTRY/api-gateway:$IMAGE_TAG
docker pull $REGISTRY/listings-service:$IMAGE_TAG
docker pull $REGISTRY/search-service:$IMAGE_TAG
docker pull $REGISTRY/media-service:$IMAGE_TAG
docker pull $REGISTRY/content-service:$IMAGE_TAG
docker pull $REGISTRY/analytics-service:$IMAGE_TAG
docker pull $REGISTRY/frontend:$IMAGE_TAG

# Stop old containers
docker-compose -f docker-compose.prod.yml down

# Run migrations
docker run --rm \
  --env-file .env.$ENVIRONMENT \
  $REGISTRY/listings-service:$IMAGE_TAG \
  node migrations/run.js

# Start new containers
docker-compose -f docker-compose.prod.yml up -d

# Health check
sleep 10
curl -f http://localhost:3000/health || exit 1

echo "Deployment complete"
```

**VPS Setup Checklist:**

- [ ] **Server:** Ubuntu 22.04 LTS, minimum 4 CPU, 8GB RAM (for all services)
- [ ] **Docker:** Install Docker and Docker Compose
- [ ] **NGINX:** Install and configure NGINX as reverse proxy
- [ ] **SSL:** Install Certbot for Let's Encrypt certificates
- [ ] **Firewall:** Configure UFW (allow 80, 443, 22)
- [ ] **Monitoring:** Install monitoring agent (optional)
- [ ] **Backups:** Configure automated backups for databases

**ASSUMPTION:** VPS deployment is suitable for MVP or small-scale production. For high availability, use Kubernetes or multiple VPS instances with load balancer.

---

### 9.8 Secrets Management

**Secrets Storage:**

| Environment | Secrets Storage | Rationale |
|-------------|----------------|-----------|
| **Development** | `.env.local` (gitignored) | Simple, local development |
| **CI/CD** | GitHub Secrets | Secure, integrated with GitHub Actions |
| **Staging/Production** | Kubernetes Secrets or Vault | Secure, encrypted at rest |

**GitHub Secrets (for CI/CD):**

| Secret Name | Purpose | Example |
|-------------|---------|---------|
| `REGISTRY_TOKEN` | Docker registry authentication | `ghp_...` |
| `DATABASE_URL_PROD` | Production database connection | `postgresql://...` |
| `REDIS_URL_PROD` | Production Redis connection | `redis://...` |
| `NATS_URL_PROD` | Production NATS connection | `nats://...` |
| `MINIO_ACCESS_KEY_PROD` | Production MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY_PROD` | Production MinIO secret key | `minioadmin` |
| `MEILISEARCH_MASTER_KEY_PROD` | Production Meilisearch master key | `...` |
| `JWT_SECRET_PROD` | Production JWT secret | `...` |
| `SLACK_WEBHOOK` | Slack notifications | `https://hooks.slack.com/...` |

**Kubernetes Secrets:**

```yaml
# Create secret from file
kubectl create secret generic listings-service-secrets \
  --from-file=DATABASE_URL=./secrets/database-url.txt \
  --namespace=production

# Or use Sealed Secrets (encrypted in Git)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: listings-service-secrets
spec:
  encryptedData:
    DATABASE_URL: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEQAx...
```

**VPS Secrets:**

Store secrets in `.env.production` file (restricted permissions):

```bash
# Set file permissions
chmod 600 .env.production

# Load in deployment script
source .env.production
```

**Secrets Rotation Strategy:**

| Secret Type | Rotation Frequency | Method |
|-------------|-------------------|--------|
| **Database Passwords** | Quarterly | Update secret, restart services |
| **JWT Secrets** | Annually | Update secret, invalidate existing tokens |
| **API Keys** | As needed | Update secret, restart services |
| **TLS Certificates** | Auto (Let's Encrypt) | Cert-manager or Certbot |

**ASSUMPTION:** Secrets are never committed to Git. Use `.gitignore` for `.env*` files. For production, consider HashiCorp Vault or AWS Secrets Manager for advanced secret management.

---

### 9.9 Deployment Verification

**Post-Deployment Checklist:**

- [ ] **Health Checks:** All services return `200 OK` on `/health`
- [ ] **Database Migrations:** All migrations applied successfully
- [ ] **Service Discovery:** Services can communicate (gateway → services)
- [ ] **External Dependencies:** Redis, NATS, Meilisearch, MinIO accessible
- [ ] **API Endpoints:** Public APIs respond correctly (test with curl)
- [ ] **Frontend:** Frontend loads, no console errors
- [ ] **Search:** Search functionality works (Meilisearch indexed)
- [ ] **Media:** Image upload/download works (MinIO accessible)
- [ ] **Events:** Events flow through NATS (check streams)
- [ ] **Monitoring:** Metrics and logs flowing to observability stack
- [ ] **SSL/TLS:** HTTPS working, certificates valid
- [ ] **Rate Limiting:** Rate limiting active (test with multiple requests)

**Smoke Test Script (`scripts/smoke-test.sh`):**

```bash
#!/bin/bash
set -e

API_URL=${1:-http://localhost:3000}

echo "Running smoke tests against $API_URL"

# Health check
curl -f $API_URL/health || exit 1

# List buildings
curl -f "$API_URL/api/v1/buildings?limit=10" || exit 1

# Get building detail
BUILDING_ID=$(curl -s "$API_URL/api/v1/buildings?limit=1" | jq -r '.data[0].id')
curl -f "$API_URL/api/v1/buildings/$BUILDING_ID" || exit 1

# Search
curl -f "$API_URL/api/v1/search?q=yerevan" || exit 1

# Blog list
curl -f "$API_URL/api/v1/blog" || exit 1

echo "Smoke tests passed"
```

**Rollback Procedure:**

1. **Identify Issue:** Check logs, metrics, alerts
2. **Stop Deployment:** If deployment in progress, stop it
3. **Revert Image Tag:** Deploy previous known-good image tag
4. **Rollback Migrations:** If migration caused issue, rollback migration (if supported)
5. **Verify Rollback:** Run smoke tests, check health endpoints
6. **Post-Mortem:** Document issue and root cause

**ASSUMPTION:** Rollback is tested in staging before production deployment. For zero-downtime rollbacks, use blue-green deployment strategy.

---

**ASSUMPTION:** CI/CD pipelines are configured and tested in development environment before production use. All deployment steps are automated; manual steps are documented as fallback only.

---

## 10) Observability & Security

### 10.1 Observability Stack Overview

**Three Pillars of Observability:**

| Pillar | Purpose | Technology | Storage |
|--------|---------|------------|---------|
| **Tracing** | Distributed request flow across services | OpenTelemetry → Tempo/Jaeger | Tempo (Grafana Cloud) or Jaeger |
| **Metrics** | System performance, business KPIs | Prometheus + OpenTelemetry | Prometheus TSDB |
| **Logs** | Event logs, errors, audit trails | OpenTelemetry → Loki | Loki (Grafana Cloud) |

**Observability Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Services                      │
│  (NestJS with OpenTelemetry SDK instrumentation)            │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─── Traces ───> OpenTelemetry Collector ───> Tempo
             ├─── Metrics ──> OpenTelemetry Collector ───> Prometheus
             └─── Logs ─────> OpenTelemetry Collector ───> Loki
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │  Grafana UI     │
                                                    │  (Dashboards)   │
                                                    └─────────────────┘
```

**ASSUMPTION:** OpenTelemetry Collector runs as a sidecar (Kubernetes) or as a separate service (VPS). For MVP, use Grafana Cloud (managed) or self-hosted Grafana stack.

---

### 10.2 OpenTelemetry Setup

**Installation in NestJS Services:**

```bash
# Install OpenTelemetry packages
pnpm add @opentelemetry/api @opentelemetry/sdk-node \
  @opentelemetry/instrumentation-nestjs-core \
  @opentelemetry/instrumentation-http \
  @opentelemetry/instrumentation-pg \
  @opentelemetry/instrumentation-redis \
  @opentelemetry/instrumentation-nats
```

**Service Instrumentation (`apps/listings-service/src/instrumentation.ts`):**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'listings-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 60000, // Export every 60 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-redis': {
        enabled: true,
      },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down'))
    .catch((error) => console.error('Error shutting down SDK', error));
});
```

**Bootstrap Instrumentation (`apps/listings-service/src/main.ts`):**

```typescript
// Import instrumentation FIRST, before any other imports
import './instrumentation';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// ... rest of bootstrap
```

**Custom Spans in Business Logic:**

```typescript
import { Span, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('listings-service');

async function createBuilding(data: CreateBuildingDto) {
  return tracer.startActiveSpan('createBuilding', async (span: Span) => {
    try {
      span.setAttributes({
        'building.developer_id': data.developerId,
        'building.price_range_min': data.priceRangeMin,
        'building.price_range_max': data.priceRangeMax,
      });

      const building = await this.buildingsRepository.create(data);
      
      span.setAttribute('building.id', building.id);
      span.setStatus({ code: SpanStatusCode.OK });
      
      return building;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**ASSUMPTION:** OpenTelemetry Collector is configured to receive OTLP (HTTP/gRPC) and forward to Tempo, Prometheus, and Loki. Collector configuration is environment-specific.

---

### 10.3 Logging Strategy

**Structured Logging with Winston + Pino (choose one):**

**Option A: Winston (NestJS Logger integration):**

```typescript
// apps/listings-service/src/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.colorize({ all: false }), // Disable colors for JSON
      ),
    }),
    // Optional: File transport for local dev
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),
  ],
  defaultMeta: {
    service: 'listings-service',
    environment: process.env.NODE_ENV,
  },
});
```

**Option B: Pino (faster, lower overhead):**

```typescript
// apps/listings-service/src/logger.config.ts
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';

export const loggerConfig = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
          },
        }
      : undefined,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: pino.stdSerializers.err,
    },
    customProps: (req) => ({
      service: 'listings-service',
      traceId: req.headers['x-trace-id'],
    }),
  },
});
```

**Log Levels:**

| Level | Use Case | Example |
|-------|----------|---------|
| **ERROR** | Unhandled exceptions, critical failures | Database connection lost, payment processing failed |
| **WARN** | Recoverable issues, deprecations | Rate limit exceeded, deprecated API usage |
| **INFO** | Business events, state changes | Building created, user logged in, cache miss |
| **DEBUG** | Detailed diagnostic info | SQL query executed, cache hit, event published |
| **TRACE** | Very verbose, performance profiling | Function entry/exit, loop iterations |

**Log Context Enrichment:**

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);

  async findById(id: string) {
    const context = { buildingId: id, operation: 'findById' };
    
    this.logger.debug('Fetching building', context);
    
    try {
      const building = await this.repository.findOne({ where: { id } });
      
      if (!building) {
        this.logger.warn('Building not found', context);
        throw new NotFoundException();
      }
      
      this.logger.log('Building fetched successfully', { ...context, found: true });
      return building;
    } catch (error) {
      this.logger.error('Failed to fetch building', {
        ...context,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

**Log Aggregation to Loki:**

**Option 1: OpenTelemetry Collector → Loki (recommended):**

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    labels:
      resource:
        service.name: "service_name"
        deployment.environment: "deployment_environment"
    tenant_id: "1"

service:
  pipelines:
    logs:
      receivers: [otlp]
      exporters: [loki]
```

**Option 2: Promtail (sidecar) → Loki:**

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: listings-service
    static_configs:
      - targets:
          - localhost
        labels:
          job: listings-service
          __path__: /var/log/listings-service/*.log
```

**ASSUMPTION:** Logs are structured JSON in production. Log retention: 30 days for INFO/DEBUG, 90 days for ERROR/WARN. Log rotation configured to prevent disk space issues.

---

### 10.4 Metrics Collection

**Prometheus Metrics (OpenTelemetry + Custom):**

**Custom Business Metrics:**

```typescript
// apps/listings-service/src/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from '@opentelemetry/api-metrics';

@Injectable()
export class MetricsService {
  private readonly buildingsCreatedCounter: Counter;
  private readonly buildingsViewedCounter: Counter;
  private readonly buildingQueryDuration: Histogram;
  private readonly activeConnectionsGauge: Gauge;

  constructor() {
    const meter = metrics.getMeter('listings-service');
    
    this.buildingsCreatedCounter = meter.createCounter('buildings_created_total', {
      description: 'Total number of buildings created',
    });
    
    this.buildingsViewedCounter = meter.createCounter('buildings_viewed_total', {
      description: 'Total number of building detail views',
    });
    
    this.buildingQueryDuration = meter.createHistogram('building_query_duration_seconds', {
      description: 'Duration of building queries in seconds',
      unit: 's',
    });
    
    this.activeConnectionsGauge = meter.createGauge('database_active_connections', {
      description: 'Number of active database connections',
    });
  }

  recordBuildingCreated(developerId: string) {
    this.buildingsCreatedCounter.add(1, { developer_id: developerId });
  }

  recordBuildingViewed(buildingId: string) {
    this.buildingsViewedCounter.add(1, { building_id: buildingId });
  }

  recordQueryDuration(duration: number, queryType: string) {
    this.buildingQueryDuration.record(duration, { query_type: queryType });
  }

  setActiveConnections(count: number) {
    this.activeConnectionsGauge.set(count);
  }
}
```

**System Metrics (Auto-instrumented):**

- **HTTP Metrics:** `http_request_duration_seconds`, `http_requests_total`, `http_request_size_bytes`
- **Database Metrics:** `db_query_duration_seconds`, `db_connections_active`, `db_connections_idle`
- **Redis Metrics:** `redis_commands_total`, `redis_command_duration_seconds`
- **NATS Metrics:** `nats_messages_published_total`, `nats_messages_consumed_total`, `nats_consumer_lag`

**Prometheus Scraping Configuration:**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'listings-service'
    static_configs:
      - targets: ['listings-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

**Prometheus Retention:**

| Environment | Retention | Reasoning |
|-------------|-----------|-----------|
| **Development** | 7 days | Cost optimization |
| **Staging** | 30 days | Testing and debugging |
| **Production** | 90 days | Incident analysis, capacity planning |

**ASSUMPTION:** Prometheus is configured with appropriate retention policies. For long-term storage, consider Thanos or Cortex. For MVP, 90-day retention is sufficient.

---

### 10.5 Grafana Dashboards

**Dashboard Categories:**

1. **System Health Dashboard**
2. **Service Performance Dashboard**
3. **Business Metrics Dashboard**
4. **Error Tracking Dashboard**
5. **Database Performance Dashboard**
6. **Event Processing Dashboard**

**System Health Dashboard (`dashboards/system-health.json`):**

**Key Panels:**

- **Service Uptime:** `up{job="listings-service"}` (Gauge)
- **Request Rate:** `rate(http_requests_total[5m])` (Graph)
- **Error Rate:** `rate(http_requests_total{status=~"5.."}[5m])` (Graph)
- **Response Time (p50, p95, p99):** `histogram_quantile(0.95, http_request_duration_seconds_bucket)` (Graph)
- **CPU Usage:** `rate(process_cpu_user_seconds_total[5m])` (Graph)
- **Memory Usage:** `process_resident_memory_bytes` (Graph)
- **Database Connections:** `db_connections_active` (Gauge)

**Service Performance Dashboard:**

**Key Panels:**

- **Endpoint Latency (by route):** `histogram_quantile(0.95, http_request_duration_seconds_bucket{route="/api/v1/buildings"})`
- **Request Volume (by endpoint):** `sum(rate(http_requests_total[5m])) by (route)`
- **Cache Hit Rate:** `rate(cache_hits_total[5m]) / rate(cache_requests_total[5m])`
- **Database Query Duration:** `histogram_quantile(0.95, db_query_duration_seconds_bucket)`
- **Event Processing Lag:** `nats_consumer_lag` (for each consumer)

**Business Metrics Dashboard:**

**Key Panels:**

- **Buildings Created (per day):** `sum(increase(buildings_created_total[1d]))`
- **Buildings Viewed (per hour):** `sum(rate(buildings_viewed_total[1h]))`
- **Search Queries:** `sum(rate(search_queries_total[5m]))`
- **Favorites Added:** `sum(rate(favorites_added_total[5m]))`
- **Contact Clicks:** `sum(rate(contact_clicks_total[5m]))`
- **Mortgage Calculator Uses:** `sum(rate(mortgage_calculator_uses_total[5m]))`

**Error Tracking Dashboard:**

**Key Panels:**

- **Error Rate by Service:** `sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)`
- **Top Errors (log patterns):** Loki query: `{service="listings-service"} |= "ERROR" | logfmt | topk(10, count_over_time({service="listings-service"} |= "ERROR" [1h]))`
- **Exception Types:** `sum(rate(exceptions_total[5m])) by (exception_type)`
- **Failed Event Processing:** `sum(rate(nats_messages_failed_total[5m])) by (consumer)`

**Database Performance Dashboard:**

**Key Panels:**

- **Query Duration (p95):** `histogram_quantile(0.95, pg_stat_statements_mean_exec_time)`
- **Slow Queries:** `pg_stat_statements_calls{mean_exec_time > 1}`
- **Connection Pool Usage:** `db_connections_active / db_connections_max`
- **Transaction Rate:** `rate(pg_stat_database_xact_commit[5m])`
- **Deadlocks:** `pg_stat_database_deadlocks`

**Event Processing Dashboard:**

**Key Panels:**

- **Event Publishing Rate:** `sum(rate(nats_messages_published_total[5m])) by (subject)`
- **Event Consumption Rate:** `sum(rate(nats_messages_consumed_total[5m])) by (consumer)`
- **Consumer Lag:** `nats_consumer_lag` (alert if > 1000)
- **DLQ Size:** `nats_dlq_messages_total`
- **Outbox Processing Duration:** `histogram_quantile(0.95, outbox_processing_duration_seconds_bucket)`

**Dashboard Export Format:**

Dashboards are stored as JSON files in `monitoring/dashboards/` and imported into Grafana via:

```bash
# Import dashboard
grafana-cli admin import-dashboard monitoring/dashboards/system-health.json
```

**ASSUMPTION:** Grafana dashboards are version-controlled. Dashboard JSON files are exported from Grafana UI and committed to the repository. Dashboard IDs are consistent across environments.

---

### 10.6 Alerting Rules

**Prometheus Alerting Rules (`monitoring/alerts/rules.yml`):**

```yaml
groups:
  - name: service_health
    interval: 30s
    rules:
      - alert: ServiceDown
        expr: up{job=~"listings-service|api-gateway|search-service"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 2 minutes"

      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          /
          sum(rate(http_requests_total[5m])) by (service)
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.service }}"

      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, http_request_duration_seconds_bucket{route="/api/v1/buildings"}) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time for buildings endpoint"
          description: "95th percentile response time is {{ $value }}s"

  - name: database
    interval: 30s
    rules:
      - alert: DatabaseConnectionPoolExhausted
        expr: db_connections_active / db_connections_max > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value | humanizePercentage }} of connections in use"

      - alert: SlowQueries
        expr: histogram_quantile(0.95, db_query_duration_seconds_bucket) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "95th percentile query duration is {{ $value }}s"

  - name: infrastructure
    interval: 30s
    rules:
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / (1024 * 1024 * 1024) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage in {{ $labels.service }}"
          description: "Memory usage is {{ $value }}GB"

      - alert: HighCPUUsage
        expr: rate(process_cpu_user_seconds_total[5m]) > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage in {{ $labels.service }}"
          description: "CPU usage is {{ $value | humanizePercentage }}"

  - name: events
    interval: 30s
    rules:
      - alert: HighConsumerLag
        expr: nats_consumer_lag > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High consumer lag for {{ $labels.consumer }}"
          description: "Consumer lag is {{ $value }} messages"

      - alert: DLQMessagesAccumulating
        expr: nats_dlq_messages_total > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Messages accumulating in DLQ"
          description: "{{ $value }} messages in DLQ for {{ $labels.consumer }}"
```

**Alertmanager Configuration (`monitoring/alerts/alertmanager.yml`):**

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      continue: true
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'critical-alerts'
    slack_configs:
      - channel: '#alerts-critical'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'

  - name: 'warning-alerts'
    slack_configs:
      - channel: '#alerts-warning'
        title: '⚠️ WARNING: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

**Alert Severity Levels:**

| Severity | Response Time | Notification Channel | Example |
|----------|---------------|---------------------|---------|
| **Critical** | Immediate | PagerDuty + Slack | Service down, database unavailable |
| **Warning** | Within 1 hour | Slack | High error rate, slow queries |
| **Info** | Next business day | Email digest | New deployment, feature flag change |

**ASSUMPTION:** Alertmanager is configured with Slack webhooks and PagerDuty (for critical alerts). On-call rotation is managed outside of this system. Alert fatigue is minimized by tuning thresholds and grouping rules.

---

### 10.7 Security Hardening Checklist

**Application Security:**

- [ ] **Input Validation:** All endpoints validate input using `class-validator` and `class-transformer`
- [ ] **SQL Injection Prevention:** Use parameterized queries (TypeORM), never string concatenation
- [ ] **XSS Prevention:** Sanitize user input, use CSP headers, escape output in templates
- [ ] **CSRF Protection:** CSRF tokens for state-changing operations (if using cookies)
- [ ] **Rate Limiting:** Implement per-IP and per-user rate limits (Redis-based)
- [ ] **Authentication:** JWT tokens with short expiration (15 min access, 7 days refresh)
- [ ] **Authorization:** RBAC enforced at controller/service level, deny by default
- [ ] **Password Security:** Bcrypt with cost factor 12+, password complexity requirements
- [ ] **Secrets Management:** No secrets in code, use environment variables or secret managers
- [ ] **Dependency Scanning:** Regular `pnpm audit` and automated Dependabot/Snyk scans
- [ ] **HTTPS Only:** Enforce HTTPS in production, redirect HTTP to HTTPS
- [ ] **Security Headers:** Helmet.js configured with appropriate CSP, HSTS, X-Frame-Options
- [ ] **API Versioning:** Deprecate old versions gracefully, document breaking changes
- [ ] **Error Handling:** Don't expose stack traces or internal errors to clients
- [ ] **Audit Logging:** Log all admin actions, authentication events, data modifications

**Infrastructure Security:**

- [ ] **Network Segmentation:** Services communicate over private network, only gateway exposed
- [ ] **Firewall Rules:** Restrict ingress to necessary ports only (80, 443, 22 for SSH)
- [ ] **Database Access:** Database not exposed to internet, only accessible from application services
- [ ] **Redis Security:** Redis password-protected, bind to localhost/private IP
- [ ] **NATS Security:** NATS with TLS, authentication tokens, no anonymous access
- [ ] **MinIO Security:** MinIO with access keys, bucket policies, no public read by default
- [ ] **Container Security:** Use non-root user in Docker containers, scan images for vulnerabilities
- [ ] **Kubernetes RBAC:** Service accounts with minimal permissions, no cluster-admin for services
- [ ] **TLS Certificates:** Valid TLS certificates (Let's Encrypt), auto-renewal configured
- [ ] **Backup Encryption:** Database backups encrypted at rest, encrypted in transit
- [ ] **OS Updates:** Regular security patches for OS and base images
- [ ] **SSH Access:** SSH key-based authentication only, disable password auth, restrict to specific IPs

**Security Headers Configuration (NestJS):**

```typescript
// apps/api-gateway/src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://example.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(3000);
}
```

**Rate Limiting Configuration:**

```typescript
// apps/api-gateway/src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // Time window in seconds
      limit: 100, // Max requests per window
      storage: new ThrottlerStorageRedisService({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**Dependency Scanning:**

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run pnpm audit
        run: pnpm audit --audit-level=moderate
      
      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

**ASSUMPTION:** Security scanning is automated in CI. Critical vulnerabilities block deployments. Security headers are tested using tools like securityheaders.com or Mozilla Observatory.

---

### 10.8 Audit Logging

**Audit Log Schema:**

```sql
-- apps/listings-service/migrations/xxx_create_audit_logs.sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL,
  user_id UUID,
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
  resource_type VARCHAR(100) NOT NULL, -- 'building', 'blog_post', 'user'
  resource_id UUID,
  changes JSONB, -- Before/after state for UPDATE actions
  ip_address INET,
  user_agent TEXT,
  request_id UUID, -- Correlation ID from trace
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

**Audit Log Service:**

```typescript
// apps/listings-service/src/audit/audit-log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log({
    userId,
    userEmail,
    action,
    resourceType,
    resourceId,
    changes,
    ipAddress,
    userAgent,
    requestId,
  }: {
    userId?: string;
    userEmail?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }) {
    const auditLog = this.auditLogRepository.create({
      serviceName: 'listings-service',
      userId,
      userEmail,
      action,
      resourceType,
      resourceId,
      changes,
      ipAddress,
      userAgent,
      requestId,
    });

    await this.auditLogRepository.save(auditLog);
  }
}
```

**Audit Log Interceptor:**

```typescript
// apps/listings-service/src/audit/audit-log.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, body, params, query, ip, headers } = request;

    const action = this.getAction(method);
    const resourceType = this.getResourceType(url);
    const resourceId = params.id || body.id;

    return next.handle().pipe(
      tap(async (response) => {
        // Only log state-changing operations
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          await this.auditLogService.log({
            userId: user?.id,
            userEmail: user?.email,
            action,
            resourceType,
            resourceId,
            changes: method === 'PUT' || method === 'PATCH' ? body : undefined,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            requestId: headers['x-request-id'],
          });
        }
      }),
    );
  }

  private getAction(method: string): string {
    const map: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method] || 'UNKNOWN';
  }

  private getResourceType(url: string): string {
    // Extract resource type from URL: /api/v1/buildings -> 'building'
    const match = url.match(/\/api\/v\d+\/(\w+)/);
    return match ? match[1].replace(/s$/, '') : 'unknown';
  }
}
```

**Audit Log Retention:**

| Log Type | Retention Period | Reasoning |
|----------|------------------|-----------|
| **Admin Actions** | 7 years | Compliance, legal requirements |
| **Data Modifications** | 5 years | Audit trail, rollback capability |
| **Authentication Events** | 2 years | Security investigation |
| **API Access Logs** | 90 days | Performance analysis, debugging |

**ASSUMPTION:** Audit logs are immutable (append-only). Audit log access is restricted to security team and compliance officers. Audit logs are backed up separately from application data.

---

### 10.9 Backup & Restore Plan

**Backup Strategy:**

| Resource | Backup Frequency | Retention | Method | Location |
|----------|------------------|-----------|--------|----------|
| **PostgreSQL Databases** | Daily (full) + Hourly (WAL) | 30 days | `pg_dump` + WAL archiving | S3/MinIO |
| **Redis** | Daily (RDB snapshot) | 7 days | `BGSAVE` | S3/MinIO |
| **MinIO Buckets** | Continuous (versioning) | 90 days | S3 versioning | MinIO (cross-region) |
| **Application Configs** | On change | 90 days | Git + encrypted export | Git + S3 |
| **Secrets** | On rotation | 1 year | Encrypted export | Vault/S3 |

**PostgreSQL Backup Script (`scripts/backup-database.sh`):**

```bash
#!/bin/bash
set -e

SERVICE_NAME=${1:-listings-service}
DB_NAME=${SERVICE_NAME//-/_}
BACKUP_DIR="/backups/${SERVICE_NAME}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Full backup
pg_dump \
  -h "$POSTGRES_HOST" \
  -U "$POSTGRES_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --format=custom \
  | gzip > "$BACKUP_FILE"

# Upload to MinIO/S3
mc cp "$BACKUP_FILE" "s3/backups/${SERVICE_NAME}/"

# Cleanup local backups older than 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

**PostgreSQL WAL Archiving:**

```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'mc cp %p s3/backups/wal-archive/%f'
```

**Redis Backup Script (`scripts/backup-redis.sh`):**

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups/redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

mkdir -p "$BACKUP_DIR"

# Trigger background save
redis-cli -h "$REDIS_HOST" BGSAVE

# Wait for save to complete
while [ "$(redis-cli -h "$REDIS_HOST" LASTSAVE)" = "$(redis-cli -h "$REDIS_HOST" LASTSAVE)" ]; do
  sleep 1
done

# Copy RDB file
cp "/var/lib/redis/dump.rdb" "$BACKUP_FILE"

# Upload to MinIO/S3
mc cp "$BACKUP_FILE" "s3/backups/redis/"

# Cleanup local backups older than 3 days
find "$BACKUP_DIR" -name "*.rdb" -mtime +3 -delete

echo "Redis backup completed: $BACKUP_FILE"
```

**MinIO Backup (Versioning):**

```bash
# Enable versioning on buckets
mc version enable s3/buildings-media
mc version enable s3/blog-media

# Set lifecycle policy (delete old versions after 90 days)
mc ilm add s3/buildings-media --expiry-days 90
```

**Automated Backup Schedule (Cron):**

```bash
# /etc/cron.d/backups
# PostgreSQL backups (daily at 2 AM)
0 2 * * * /app/scripts/backup-database.sh listings-service
0 2 * * * /app/scripts/backup-database.sh search-service
0 2 * * * /app/scripts/backup-database.sh content-service

# Redis backup (daily at 3 AM)
0 3 * * * /app/scripts/backup-redis.sh

# Verify backups (daily at 4 AM)
0 4 * * * /app/scripts/verify-backups.sh
```

**Restore Procedures:**

**PostgreSQL Restore:**

```bash
#!/bin/bash
# scripts/restore-database.sh

SERVICE_NAME=$1
BACKUP_FILE=$2
DB_NAME=${SERVICE_NAME//-/_}

if [ -z "$SERVICE_NAME" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <service-name> <backup-file>"
  exit 1
fi

# Download backup from S3
mc cp "s3/backups/${SERVICE_NAME}/${BACKUP_FILE}" /tmp/restore.sql.gz

# Drop existing database (WARNING: destructive)
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restore
gunzip -c /tmp/restore.sql.gz | \
  pg_restore \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl

echo "Database restored: $DB_NAME"
```

**Redis Restore:**

```bash
#!/bin/bash
# scripts/restore-redis.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

# Download backup from S3
mc cp "s3/backups/redis/${BACKUP_FILE}" /tmp/restore.rdb

# Stop Redis (if running)
systemctl stop redis

# Replace RDB file
cp /tmp/restore.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb

# Start Redis
systemctl start redis

echo "Redis restored from: $BACKUP_FILE"
```

**Backup Verification:**

```bash
#!/bin/bash
# scripts/verify-backups.sh

set -e

echo "Verifying backups..."

# Check PostgreSQL backups
for service in listings-service search-service content-service; do
  LATEST_BACKUP=$(mc ls "s3/backups/${service}/" | tail -1 | awk '{print $NF}')
  if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found for $service"
    exit 1
  fi
  
  # Verify backup file is not corrupted
  mc cat "s3/backups/${service}/${LATEST_BACKUP}" | gunzip | head -1 > /dev/null
  echo "✓ $service backup verified: $LATEST_BACKUP"
done

# Check Redis backup
LATEST_REDIS_BACKUP=$(mc ls "s3/backups/redis/" | tail -1 | awk '{print $NF}')
if [ -z "$LATEST_REDIS_BACKUP" ]; then
  echo "ERROR: No Redis backup found"
  exit 1
fi
echo "✓ Redis backup verified: $LATEST_REDIS_BACKUP"

echo "All backups verified successfully"
```

**Disaster Recovery Plan:**

1. **RTO (Recovery Time Objective):** 4 hours
2. **RPO (Recovery Point Objective):** 1 hour (last hourly WAL backup)

**Recovery Steps:**

1. **Assess Damage:** Identify affected services and data loss scope
2. **Restore Infrastructure:** Provision new infrastructure if needed
3. **Restore Databases:** Restore from latest backup, apply WAL archives up to failure point
4. **Restore Media:** Restore MinIO buckets from versioned backups
5. **Restore Application:** Deploy application from Git, restore configuration
6. **Verify Functionality:** Run smoke tests, verify data integrity
7. **Post-Mortem:** Document root cause and improve backup/restore procedures

**ASSUMPTION:** Backups are tested monthly in a staging environment. Backup restoration procedures are documented and practiced. Backup storage is encrypted and stored in a separate region/account for disaster recovery.

---

**ASSUMPTION:** Observability and security are ongoing concerns. Dashboards and alerts are refined based on production experience. Security audits are conducted quarterly. Backup and restore procedures are tested regularly.

---

## 11) Testing Strategy

### 11.1 Testing Pyramid Overview

**Testing Layers:**

```
                    ┌─────────────┐
                    │   E2E Tests │  (10-15%)
                    │  (Playwright)│
                    └─────────────┘
                  ┌─────────────────┐
                  │ Integration Tests│  (20-30%)
                  │ (Service + DB)   │
                  └─────────────────┘
                ┌─────────────────────┐
                │  Contract Tests      │  (15-20%)
                │  (API Gateway ↔ Svc)│
                └─────────────────────┘
              ┌───────────────────────────┐
              │   Unit Tests              │  (50-60%)
              │  (Business Logic)         │
              └───────────────────────────┘
```

**Coverage Targets:**

| Layer | Coverage Target | Tools | Purpose |
|-------|----------------|-------|---------|
| **Unit** | 80%+ (business logic), 60%+ (overall) | Jest, Vitest | Fast feedback, isolated logic testing |
| **Integration** | Critical paths (CRUD, search, events) | Jest + Testcontainers | Service + DB interactions |
| **Contract** | All public API endpoints | Pact or OpenAPI-based | Gateway ↔ Service compatibility |
| **E2E** | Critical user journeys | Playwright | Full stack validation |
| **Performance** | Smoke tests (p50/p95/p99) | k6, Artillery | Load and latency validation |

**ASSUMPTION:** Coverage targets are guidelines. Focus on critical business logic and user-facing features. Coverage metrics are tracked but not enforced as hard gates in CI (to avoid coverage gaming).

---

### 11.2 Unit Testing

**Framework:** Jest (NestJS default) or Vitest (faster, ESM-native).

**Test Structure:**

```
apps/listings-service/
├── src/
│   ├── buildings/
│   │   ├── buildings.service.ts
│   │   ├── buildings.service.spec.ts    # Unit tests
│   │   ├── buildings.controller.ts
│   │   └── buildings.controller.spec.ts
│   └── pricing/
│       ├── pricing.service.ts
│       └── pricing.service.spec.ts
└── test/
    ├── unit/
    │   └── fixtures/                     # Test data factories
    └── helpers/
        └── test-helpers.ts
```

**Unit Test Example (Buildings Service):**

```typescript
// apps/listings-service/src/buildings/buildings.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BuildingsService } from './buildings.service';
import { Building } from './entities/building.entity';
import { Repository } from 'typeorm';
import { createBuildingFixture } from '../../../test/unit/fixtures/building.fixture';

describe('BuildingsService', () => {
  let service: BuildingsService;
  let repository: Repository<Building>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingsService,
        {
          provide: getRepositoryToken(Building),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BuildingsService>(BuildingsService);
    repository = module.get<Repository<Building>>(getRepositoryToken(Building));
  });

  describe('findAll', () => {
    it('should return paginated buildings with filters', async () => {
      const mockBuildings = [
        createBuildingFixture({ region: 'Yerevan', status: 'active' }),
        createBuildingFixture({ region: 'Gyumri', status: 'active' }),
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(mockBuildings);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        region: 'Yerevan',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].region).toBe('Yerevan');
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ region: 'Yerevan' }),
        }),
      );
    });

    it('should apply price range filter correctly', async () => {
      const mockBuildings = [
        createBuildingFixture({ pricePerSqmMin: 500, pricePerSqmMax: 800 }),
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(mockBuildings);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        priceMin: 600,
        priceMax: 700,
      });

      expect(result.data).toHaveLength(1);
      // Verify price range intersection logic
    });
  });

  describe('calculatePriceRange', () => {
    it('should convert AMD to USD with proper rounding', () => {
      const amdPrice = 500000; // 500,000 AMD
      const usdPrice = service.calculatePriceRange(amdPrice, 'USD');
      
      // Assuming 1 USD = 400 AMD
      expect(usdPrice).toBe(1250); // 500000 / 400 = 1250
    });

    it('should round to nearest 50 for USD', () => {
      const amdPrice = 410000; // 410,000 AMD = 1025 USD
      const usdPrice = service.calculatePriceRange(amdPrice, 'USD');
      
      expect(usdPrice).toBe(1050); // Rounded to nearest 50
    });
  });
});
```

**Test Data Factories:**

```typescript
// test/unit/fixtures/building.fixture.ts

import { Building } from '../../../apps/listings-service/src/buildings/entities/building.entity';
import { BuildingStatus, BuildingType } from '../../../apps/listings-service/src/buildings/enums';

export interface BuildingFixtureOverrides {
  id?: string;
  title?: Record<'am' | 'ru' | 'en', string>;
  region?: string;
  status?: BuildingStatus;
  pricePerSqmMin?: number;
  pricePerSqmMax?: number;
  coordinates?: { lat: number; lng: number };
  [key: string]: any;
}

export function createBuildingFixture(
  overrides: BuildingFixtureOverrides = {},
): Building {
  const defaults: Building = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: {
      am: 'Նոր շենք Երևանում',
      ru: 'Новое здание в Ереване',
      en: 'New Building in Yerevan',
    },
    region: 'Yerevan',
    district: 'Kentron',
    address: {
      am: 'Մաշտոցի պողոտա 1',
      ru: 'Проспект Маштоца 1',
      en: 'Mashtots Avenue 1',
    },
    status: BuildingStatus.ACTIVE,
    type: BuildingType.APARTMENT,
    pricePerSqmMin: 500000, // AMD
    pricePerSqmMax: 800000,
    totalFloors: 10,
    commissioningDate: new Date('2025-12-31'),
    coordinates: { lat: 40.1811, lng: 44.5136 },
    developerId: 'dev-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  return { ...defaults, ...overrides } as Building;
}

export function createBuildingListFixture(count: number): Building[] {
  return Array.from({ length: count }, (_, i) =>
    createBuildingFixture({
      id: `building-${i + 1}`,
      title: {
        en: `Building ${i + 1}`,
        ru: `Здание ${i + 1}`,
        am: `Շենք ${i + 1}`,
      },
    }),
  );
}
```

**Unit Test Best Practices:**

1. **Isolate Dependencies:** Mock external services (DB, HTTP clients, message brokers)
2. **Test Behavior, Not Implementation:** Focus on inputs/outputs, not internal methods
3. **Use Factories:** Centralize test data creation for consistency
4. **Test Edge Cases:** Null/undefined, empty arrays, boundary values
5. **Fast Execution:** Unit tests should run in < 1 second total

**ASSUMPTION:** Unit tests run on every commit. Mock external dependencies (PostgreSQL, NATS, Redis) using Jest mocks or in-memory implementations.

---

### 11.3 Integration Testing

**Framework:** Jest + Testcontainers (PostgreSQL, Redis, NATS).

**Test Structure:**

```
apps/listings-service/
└── test/
    └── integration/
        ├── buildings.integration.spec.ts
        ├── pricing.integration.spec.ts
        └── setup/
            ├── test-db.ts              # Testcontainers setup
            └── test-nats.ts
```

**Integration Test Example:**

```typescript
// apps/listings-service/test/integration/buildings.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BuildingsModule } from '../../src/buildings/buildings.module';
import { Building } from '../../src/buildings/entities/building.entity';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createBuildingFixture } from '../unit/fixtures/building.fixture';

describe('BuildingsService Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_listings')
      .withUsername('test')
      .withPassword('test')
      .start();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities: [Building],
          synchronize: true, // Only for tests
        }),
        BuildingsModule,
      ],
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.synchronize(true);
  });

  describe('CRUD Operations', () => {
    it('should create a building and persist to database', async () => {
      const service = module.get('BuildingsService');
      const buildingData = createBuildingFixture();

      const created = await service.create(buildingData);

      expect(created.id).toBeDefined();
      expect(created.title.en).toBe(buildingData.title.en);

      // Verify persistence
      const found = await dataSource
        .getRepository(Building)
        .findOne({ where: { id: created.id } });
      expect(found).toBeDefined();
      expect(found.title.en).toBe(buildingData.title.en);
    });

    it('should filter buildings by PostGIS coordinates', async () => {
      const service = module.get('BuildingsService');
      
      // Create buildings in different locations
      await service.create(
        createBuildingFixture({
          coordinates: { lat: 40.1811, lng: 44.5136 }, // Yerevan center
        }),
      );
      await service.create(
        createBuildingFixture({
          coordinates: { lat: 40.7942, lng: 43.8453 }, // Gyumri
        }),
      );

      // Search within 5km of Yerevan center
      const results = await service.findNearby({
        lat: 40.1811,
        lng: 44.5136,
        radiusKm: 5,
      });

      expect(results.data).toHaveLength(1);
      expect(results.data[0].coordinates.lat).toBeCloseTo(40.1811, 2);
    });

    it('should update building and trigger outbox event', async () => {
      const service = module.get('BuildingsService');
      const eventService = module.get('EventService');
      
      const building = await service.create(createBuildingFixture());
      
      const updated = await service.update(building.id, {
        pricePerSqmMin: 600000,
      });

      expect(updated.pricePerSqmMin).toBe(600000);

      // Verify outbox record created
      const outboxRecords = await dataSource
        .getRepository('OutboxEvent')
        .find({ where: { aggregateId: building.id } });
      
      expect(outboxRecords.length).toBeGreaterThan(0);
      expect(outboxRecords[0].eventType).toBe('building.updated');
    });
  });
});
```

**Testcontainers Setup:**

```typescript
// test/integration/setup/test-db.ts

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

export async function setupTestDatabase() {
  if (!container) {
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .withReuse() // Reuse container across tests if possible
      .start();
  }

  return {
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
  };
}

export async function teardownTestDatabase() {
  if (container) {
    await container.stop();
  }
}
```

**Integration Test Coverage:**

| Feature | Test Scenarios |
|---------|---------------|
| **Buildings CRUD** | Create, read, update, delete with validation |
| **Search/Filter** | PostGIS queries, text search, pagination |
| **Pricing** | Currency conversion, price snapshots, history |
| **Events** | Outbox pattern, event publishing, idempotency |
| **Media** | Image upload, processing, MinIO integration |
| **Analytics** | Event ingestion, aggregation, queries |

**ASSUMPTION:** Integration tests run in CI on every PR. Testcontainers are used for PostgreSQL, Redis, and NATS. Tests are isolated (each test cleans up after itself). Integration test suite runs in < 5 minutes.

---

### 11.4 Contract Testing

**Purpose:** Ensure API Gateway and backend services maintain compatible contracts.

**Framework Options:**

1. **Pact** (Consumer-Driven Contracts)
2. **OpenAPI-based contract tests** (simpler, fits our OpenAPI-first approach)

**Recommendation:** OpenAPI-based contract tests (validate OpenAPI spec compliance).

**Contract Test Structure:**

```
apps/api-gateway/
└── test/
    └── contracts/
        ├── listings.contract.spec.ts
        └── search.contract.spec.ts

apps/listings-service/
└── test/
    └── contracts/
        └── api.contract.spec.ts        # Validates service matches OpenAPI spec
```

**Contract Test Example (OpenAPI-based):**

```typescript
// apps/listings-service/test/contracts/api.contract.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as openapiSchema from '../../openapi.json'; // Generated OpenAPI spec
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('API Contract Tests', () => {
  let app: INestApplication;
  let ajv: Ajv;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Setup JSON Schema validator
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/buildings', () => {
    it('should match OpenAPI schema for 200 response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Get response schema from OpenAPI spec
      const responseSchema =
        openapiSchema.paths['/api/v1/buildings'].get.responses['200']
          .content['application/json'].schema;

      // Validate response against schema
      const validate = ajv.compile(responseSchema);
      const valid = validate(response.body);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    it('should reject invalid query parameters per OpenAPI spec', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .query({ page: -1, limit: 1000 }) // Invalid: page < 1, limit > 100
        .expect(400);
    });
  });

  describe('POST /api/v1/buildings', () => {
    it('should validate request body against OpenAPI schema', async () => {
      const invalidBody = {
        title: 'Test', // Missing required fields
      };

      await request(app.getHttpServer())
        .post('/api/v1/buildings')
        .send(invalidBody)
        .expect(400);
    });

    it('should accept valid request body per OpenAPI spec', async () => {
      const validBody = {
        title: {
          en: 'New Building',
          ru: 'Новое здание',
          am: 'Նոր շենք',
        },
        region: 'Yerevan',
        coordinates: { lat: 40.1811, lng: 44.5136 },
        pricePerSqmMin: 500000,
        pricePerSqmMax: 800000,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/buildings')
        .send(validBody)
        .expect(201);

      // Validate response schema
      const responseSchema =
        openapiSchema.paths['/api/v1/buildings'].post.responses['201']
          .content['application/json'].schema;

      const validate = ajv.compile(responseSchema);
      expect(validate(response.body)).toBe(true);
    });
  });
});
```

**Gateway ↔ Service Contract Test:**

```typescript
// apps/api-gateway/test/contracts/listings.contract.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('Gateway → Listings Service Contract', () => {
  let app: INestApplication;
  let httpService: HttpService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        get: jest.fn(),
        post: jest.fn(),
      })
      .compile();

    app = module.createNestApplication();
    await app.init();

    httpService = module.get<HttpService>(HttpService);
  });

  it('should forward GET /api/v1/buildings to listings service with correct format', async () => {
    const mockResponse = {
      data: {
        data: [],
        meta: { page: 1, limit: 10, total: 0 },
      },
      status: 200,
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse) as any);

    await request(app.getHttpServer())
      .get('/api/v1/buildings')
      .query({ page: 1, limit: 10 })
      .expect(200);

    // Verify gateway calls listings service with correct URL and params
    expect(httpService.get).toHaveBeenCalledWith(
      expect.stringContaining('/listings-service/api/v1/buildings'),
      expect.objectContaining({
        params: { page: 1, limit: 10 },
      }),
    );
  });

  it('should transform error responses from services to standard format', async () => {
    const mockError = {
      response: {
        data: { message: 'Building not found', code: 'NOT_FOUND' },
        status: 404,
      },
    };

    jest.spyOn(httpService, 'get').mockImplementation(() => {
      throw mockError;
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/buildings/invalid-id')
      .expect(404);

    // Verify gateway transforms service error to standard format
    expect(response.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: 'Building not found',
      },
    });
  });
});
```

**Contract Test Checklist:**

- [ ] All public API endpoints have OpenAPI schemas
- [ ] Request/response validation matches OpenAPI spec
- [ ] Gateway forwards requests with correct format
- [ ] Gateway transforms service errors to standard format
- [ ] Versioning compatibility (v1 vs v2) is tested
- [ ] Breaking changes are detected in contract tests

**ASSUMPTION:** Contract tests run in CI before deployment. OpenAPI specs are generated from code (using `@nestjs/swagger`) and validated. Contract tests fail if service responses don't match OpenAPI schema.

---

### 11.5 End-to-End (E2E) Testing

**Framework:** Playwright (recommended) or Cypress.

**Test Structure:**

```
apps/frontend/
└── e2e/
    ├── specs/
    │   ├── buildings.spec.ts
    │   ├── search.spec.ts
    │   ├── favorites.spec.ts
    │   └── blog.spec.ts
    ├── fixtures/
    │   └── test-data.ts
    └── playwright.config.ts
```

**E2E Test Example:**

```typescript
// apps/frontend/e2e/specs/buildings.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Buildings Listing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to buildings page
    await page.goto('/buildings');
  });

  test('should display buildings list with pagination', async ({ page }) => {
    // Wait for buildings to load
    await page.waitForSelector('[data-testid="building-card"]', {
      timeout: 10000,
    });

    // Verify buildings are displayed
    const buildingCards = await page.$$('[data-testid="building-card"]');
    expect(buildingCards.length).toBeGreaterThan(0);

    // Verify pagination controls
    const pagination = page.locator('[data-testid="pagination"]');
    await expect(pagination).toBeVisible();
  });

  test('should filter buildings by region', async ({ page }) => {
    // Select region filter
    await page.selectOption('[data-testid="region-filter"]', 'Yerevan');

    // Wait for results to update
    await page.waitForLoadState('networkidle');

    // Verify all displayed buildings are in Yerevan
    const regionLabels = await page
      .$$eval('[data-testid="building-region"]', (elements) =>
        elements.map((el) => el.textContent),
      );

    regionLabels.forEach((region) => {
      expect(region).toContain('Yerevan');
    });
  });

  test('should toggle currency (AMD ↔ USD)', async ({ page }) => {
    // Initial state: AMD
    const priceElement = page.locator('[data-testid="building-price"]').first();
    const initialPrice = await priceElement.textContent();
    expect(initialPrice).toContain('AMD');

    // Toggle to USD
    await page.click('[data-testid="currency-toggle"]');

    // Wait for price update
    await page.waitForTimeout(500); // Wait for state update

    const updatedPrice = await priceElement.textContent();
    expect(updatedPrice).toContain('USD');

    // Verify price conversion (approximate)
    const amdValue = parseInt(initialPrice.replace(/\D/g, ''));
    const usdValue = parseInt(updatedPrice.replace(/\D/g, ''));
    const expectedUsd = Math.round(amdValue / 400); // Assuming 1 USD = 400 AMD

    expect(usdValue).toBeCloseTo(expectedUsd, -2); // Within 100 USD
  });

  test('should navigate to building detail page', async ({ page }) => {
    // Click first building card
    await page.click('[data-testid="building-card"]:first-child');

    // Verify navigation to detail page
    await expect(page).toHaveURL(/\/buildings\/[a-z0-9-]+/);

    // Verify detail page elements
    await expect(page.locator('[data-testid="building-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="building-gallery"]')).toBeVisible();
    await expect(page.locator('[data-testid="building-price"]')).toBeVisible();
  });
});

test.describe('Map View', () => {
  test('should display map with building markers', async ({ page }) => {
    await page.goto('/buildings?view=map');

    // Wait for map to load (client-only component)
    await page.waitForSelector('[data-testid="map-container"]', {
      timeout: 15000,
    });

    // Verify markers are present
    const markers = await page.$$('[data-testid="map-marker"]');
    expect(markers.length).toBeGreaterThan(0);
  });

  test('should cluster markers when zoomed out', async ({ page }) => {
    await page.goto('/buildings?view=map');

    await page.waitForSelector('[data-testid="map-container"]');

    // Zoom out
    await page.click('[data-testid="map-zoom-out"]');

    // Wait for clustering
    await page.waitForTimeout(1000);

    // Verify cluster markers appear
    const clusters = await page.$$('[data-testid="map-cluster"]');
    expect(clusters.length).toBeGreaterThan(0);
  });
});

test.describe('Favorites', () => {
  test('should add building to favorites (localStorage)', async ({ page }) => {
    await page.goto('/buildings');

    // Get building ID
    const buildingId = await page
      .locator('[data-testid="building-card"]:first-child')
      .getAttribute('data-building-id');

    // Click favorite button
    await page.click(
      `[data-testid="favorite-button"][data-building-id="${buildingId}"]`,
    );

    // Verify favorite is saved in localStorage
    const favorites = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('favorites') || '[]');
    });

    expect(favorites).toContain(buildingId);
  });

  test('should persist favorites across page reloads', async ({ page }) => {
    // Add favorite
    await page.goto('/buildings');
    const buildingId = await page
      .locator('[data-testid="building-card"]:first-child')
      .getAttribute('data-building-id');

    await page.click(
      `[data-testid="favorite-button"][data-building-id="${buildingId}"]`,
    );

    // Reload page
    await page.reload();

    // Verify favorite button is still active
    const isFavorite = await page
      .locator(
        `[data-testid="favorite-button"][data-building-id="${buildingId}"]`,
      )
      .getAttribute('data-favorite');

    expect(isFavorite).toBe('true');
  });
});
```

**Playwright Configuration:**

```typescript
// apps/frontend/e2e/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**E2E Test Coverage (Critical User Journeys):**

| Journey | Test Scenarios |
|---------|---------------|
| **Browse Buildings** | List view, map view, filters, pagination, sorting |
| **Building Details** | View details, gallery, contact actions, share |
| **Search** | Text search, filters, map integration |
| **Favorites** | Add/remove, persistence, favorites page |
| **Blog** | List articles, read article, navigation |
| **Mortgage Calculator** | Calculate, currency toggle, form validation |
| **Language Toggle** | AM/RU/EN switching, content translation |
| **Mobile Responsiveness** | Key flows on mobile viewport |

**ASSUMPTION:** E2E tests run in CI on main branch and before releases. Tests run against a test environment (not production). Screenshots and videos are captured on failure. E2E suite runs in < 10 minutes.

---

### 11.6 Performance Testing

**Framework:** k6 (recommended) or Artillery.

**Performance Test Structure:**

```
test/
└── performance/
    ├── load/
    │   ├── buildings.load.js
    │   └── search.load.js
    ├── stress/
    │   └── api.stress.js
    └── smoke/
        └── api.smoke.js
```

**Smoke Test Example (k6):**

```javascript
// test/performance/smoke/api.smoke.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '2m', target: 10 }, // Stay at 10 users
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test buildings list endpoint
  const listRes = http.get(`${BASE_URL}/api/v1/buildings?page=1&limit=10`);
  check(listRes, {
    'buildings list status is 200': (r) => r.status === 200,
    'buildings list response time < 500ms': (r) => r.timings.duration < 500,
    'buildings list has data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.length > 0;
    },
  });

  sleep(1);

  // Test building detail endpoint
  const detailRes = http.get(`${BASE_URL}/api/v1/buildings/test-id`);
  check(detailRes, {
    'building detail status is 200': (r) => r.status === 200,
    'building detail response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // Test search endpoint
  const searchRes = http.get(
    `${BASE_URL}/api/v1/search?q=yerevan&page=1&limit=10`,
  );
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
```

**Load Test Example:**

```javascript
// test/performance/load/buildings.load.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '5m', target: 50 },  // Ramp up to 50 users
    { duration: '10m', target: 50 }, // Stay at 50 users
    { duration: '5m', target: 100 }, // Ramp up to 100 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(50)<200', 'p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'], // < 2% errors
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Simulate user browsing buildings
  const listRes = http.get(
    `${BASE_URL}/api/v1/buildings?page=${Math.floor(Math.random() * 10) + 1}&limit=10`,
  );

  const listCheck = check(listRes, {
    'list status is 200': (r) => r.status === 200,
  });

  errorRate.add(!listCheck);

  sleep(2);

  // Simulate user viewing building details
  if (listRes.status === 200) {
    const body = JSON.parse(listRes.body);
    if (body.data && body.data.length > 0) {
      const buildingId = body.data[0].id;
      const detailRes = http.get(`${BASE_URL}/api/v1/buildings/${buildingId}`);

      check(detailRes, {
        'detail status is 200': (r) => r.status === 200,
      });

      sleep(3);
    }
  }
}
```

**Performance Test Targets:**

| Endpoint | p50 Target | p95 Target | p99 Target | RPS Target |
|----------|------------|------------|------------|------------|
| **GET /api/v1/buildings** | < 200ms | < 500ms | < 1000ms | 100 RPS |
| **GET /api/v1/buildings/:id** | < 100ms | < 300ms | < 500ms | 50 RPS |
| **GET /api/v1/search** | < 300ms | < 800ms | < 1500ms | 30 RPS |
| **POST /api/v1/buildings** | < 500ms | < 1000ms | < 2000ms | 10 RPS |

**Performance Test Execution:**

```bash
# Run smoke tests
k6 run test/performance/smoke/api.smoke.js

# Run load tests
k6 run test/performance/load/buildings.load.js --vus 50 --duration 10m

# Run stress tests (find breaking point)
k6 run test/performance/stress/api.stress.js --vus 200 --duration 5m
```

**Performance Test Checklist:**

- [ ] Smoke tests pass (baseline performance)
- [ ] Load tests meet p50/p95/p99 targets
- [ ] Database queries are optimized (no N+1, proper indexes)
- [ ] Caching is effective (Redis hit rate > 80%)
- [ ] Search queries are fast (< 1s for complex queries)
- [ ] Image optimization reduces payload size
- [ ] API Gateway doesn't add significant latency (< 50ms overhead)

**ASSUMPTION:** Performance tests run weekly or before major releases. Performance regressions are tracked and investigated. Load tests run against a staging environment that mirrors production infrastructure.

---

### 11.7 Test Data Management

**Test Data Factories (Reusable):**

```typescript
// test/helpers/factories.ts

export class TestDataFactory {
  static createBuilding(overrides?: Partial<Building>): Building {
    return {
      ...createBuildingFixture(),
      ...overrides,
    };
  }

  static createDeveloper(overrides?: Partial<Developer>): Developer {
    return {
      id: `dev-${Date.now()}`,
      name: { en: 'Test Developer', ru: 'Тестовый застройщик', am: 'Փորձարկման կառուցապատող' },
      ...overrides,
    };
  }

  static createBlogPost(overrides?: Partial<BlogPost>): BlogPost {
    return {
      id: `post-${Date.now()}`,
      title: { en: 'Test Post', ru: 'Тестовый пост', am: 'Փորձարկման գրառում' },
      content: { en: 'Test content', ru: 'Тестовый контент', am: 'Փորձարկման բովանդակություն' },
      publishedAt: new Date(),
      ...overrides,
    };
  }
}
```

**Database Seeding for Tests:**

```typescript
// test/helpers/seed.ts

import { DataSource } from 'typeorm';
import { Building } from '../../apps/listings-service/src/buildings/entities/building.entity';
import { createBuildingFixture } from './fixtures/building.fixture';

export async function seedTestDatabase(dataSource: DataSource) {
  const buildingRepo = dataSource.getRepository(Building);

  // Create test buildings
  const buildings = [
    createBuildingFixture({ region: 'Yerevan', status: 'active' }),
    createBuildingFixture({ region: 'Gyumri', status: 'active' }),
    createBuildingFixture({ region: 'Yerevan', status: 'draft' }),
  ];

  await buildingRepo.save(buildings);
}
```

**ASSUMPTION:** Test data is isolated per test. Factories are used for consistent test data creation. Database is cleaned/reseeded before each integration test suite.

---

### 11.8 Test Execution Strategy

**Local Development:**

```bash
# Run unit tests (watch mode)
pnpm test:unit --watch

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run all tests
pnpm test
```

**CI Pipeline:**

```yaml
# .github/workflows/test.yml (example)

name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:unit --coverage
      - uses: codecov/codecov-action@v3

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: playwright-community/action-setup-playwright@v1
      - run: pnpm install
      - run: pnpm test:e2e
```

**Test Execution Checklist:**

- [ ] Unit tests run on every commit (< 30 seconds)
- [ ] Integration tests run on PR (< 5 minutes)
- [ ] Contract tests run on PR (< 2 minutes)
- [ ] E2E tests run on main branch (< 10 minutes)
- [ ] Performance tests run weekly or before releases
- [ ] Test failures block merges/deployments
- [ ] Coverage reports are generated and tracked

**ASSUMPTION:** All tests must pass before merging PRs. Test execution time is optimized (parallel execution, test isolation). Flaky tests are identified and fixed promptly.

---

### 11.9 Testing Best Practices Summary

**Do's:**

1. ✅ Write tests for critical business logic first
2. ✅ Use test data factories for consistency
3. ✅ Mock external dependencies in unit tests
4. ✅ Test edge cases and error scenarios
5. ✅ Keep tests fast and isolated
6. ✅ Use descriptive test names
7. ✅ Test behavior, not implementation
8. ✅ Run tests in CI before merging

**Don'ts:**

1. ❌ Don't test framework code (NestJS, TypeORM internals)
2. ❌ Don't write tests that depend on test execution order
3. ❌ Don't use real external services in unit tests
4. ❌ Don't ignore flaky tests
5. ❌ Don't write tests that are too slow (> 1s for unit, > 10s for integration)
6. ❌ Don't test implementation details (private methods, internal state)

**ASSUMPTION:** Testing is a shared responsibility. All code changes should include appropriate tests. Test quality is reviewed in code reviews alongside implementation quality.

---

## 12) Milestones

### 12.1 Milestone Planning Approach

**Timeboxing Strategy:**
- Sprints are 2 weeks each (ASSUMPTION: standard agile sprint length)
- No specific calendar dates provided (flexible start date)
- Each milestone includes: deliverables, acceptance criteria, dependencies, Definition of Done
- Milestones are sequential; some work can be parallelized within a sprint

**Team Composition Assumptions:**
- 2-4 backend developers (NestJS, PostgreSQL, NATS)
- 1-2 frontend developers (Nuxt 3, TypeScript)
- 1 DevOps/Infrastructure engineer (part-time or shared)
- 1 Product/QA person (part-time, for acceptance testing)

**Definition of Done (DoD) - Applied to All Milestones:**
- [ ] Code reviewed and approved (at least 1 reviewer)
- [ ] Unit tests written and passing (coverage ≥ 70% for new code)
- [ ] Integration tests passing (where applicable)
- [ ] Linter/formatting checks passing
- [ ] Documentation updated (API docs, README sections, inline comments)
- [ ] Deployed to development environment
- [ ] Acceptance criteria met (verified by product/QA)
- [ ] No critical security vulnerabilities
- [ ] Performance benchmarks met (where specified)

---

### 12.2 Sprint 0: Foundation & Setup (Pre-Development)

**Duration:** 2 weeks

**Deliverables:**
1. Repository structure (monorepo with Nx/Turborepo)
2. Docker Compose stack (PostgreSQL, Redis, NATS, MinIO, Meilisearch) running locally
3. Basic NestJS application skeleton (modular monolith structure)
4. Basic Nuxt 3 application skeleton (SSR enabled, i18n configured)
5. CI/CD pipeline skeleton (GitHub Actions or equivalent)
6. Development environment documentation
7. OpenAPI contract templates (empty schemas for all planned endpoints)

**Acceptance Criteria:**
- [ ] All developers can run `docker-compose up` and access all services
- [ ] NestJS app starts and connects to PostgreSQL
- [ ] Nuxt 3 app starts in SSR mode and renders a basic page
- [ ] CI pipeline runs on PR (lint, type-check, unit tests)
- [ ] Environment variables documented in `.env.example`
- [ ] OpenAPI spec files created for each service module

**Dependencies:**
- Architecture decision finalized (Modular Monolith vs Microservices)
- Team access to repository and development tools

**Definition of Done:**
- [ ] All deliverables completed
- [ ] Team onboarding guide written
- [ ] Local development setup tested by at least 2 developers
- [ ] CI pipeline green on main branch

---

### 12.3 Sprint 1: Core Data Model & Database Setup

**Duration:** 2 weeks

**Deliverables:**
1. PostgreSQL schemas for all core entities (Buildings, Developers, Regions, PricingSnapshots, Blog, Media) **(MVP:** schema-per-module in ONE shared Postgres instance; **Target:** DB-per-service with separate database instances)
2. PostGIS extension enabled and spatial indexes created
3. TypeORM entities for all tables
4. Database migrations (initial schema)
5. Seed script with sample data (10-20 buildings, 3-5 developers, 5-10 blog articles)
6. Composite indexes for common query patterns
7. Database backup/restore scripts

**Acceptance Criteria:**
- [ ] All tables created with proper constraints (foreign keys, check constraints, NOT NULL)
- [ ] PostGIS spatial queries work (distance, bounding box, point-in-polygon)
- [ ] Indexes created for: price range, area range, location (GIST), commissioning date, developer_id
- [ ] Seed script populates database with realistic test data
- [ ] Migration rollback tested
- [ ] Backup script successfully creates and restores database

**Dependencies:**
- Sprint 0 completed
- Data model finalized (Section 4)

**Definition of Done:**
- [ ] All migrations applied successfully
- [ ] Seed data verified (spatial queries return expected results)
- [ ] Database schema documented (ERD or text description)
- [ ] Performance test: 10K buildings query with filters completes in < 200ms

---

### 12.4 Sprint 2: Listings Service - Core CRUD & API Gateway

**Duration:** 2 weeks

**Deliverables:**
1. Listings module (NestJS): CRUD operations for buildings
2. API Gateway module: routing, request validation, error handling
3. OpenAPI contracts for listings endpoints (GET /buildings, GET /buildings/:id, POST /buildings, PUT /buildings/:id, DELETE /buildings/:id)
4. DTOs with validation (class-validator)
5. Service layer with business logic
6. Repository layer with TypeORM queries
7. Error handling middleware (standardized error format)
8. Pagination helper (cursor-based or offset-based)

**Acceptance Criteria:**
- [ ] GET /buildings returns paginated list with filters (price, area, location, developer, commissioning date)
- [ ] GET /buildings/:id returns full building details
- [ ] POST /buildings creates building (admin only, RBAC placeholder)
- [ ] PUT /buildings/:id updates building (admin only)
- [ ] DELETE /buildings/:id soft-deletes building (admin only)
- [ ] All endpoints return OpenAPI-compliant responses
- [ ] Validation errors return 400 with clear messages
- [ ] Pagination works (page size, cursor/offset, total count)

**Dependencies:**
- Sprint 1 completed (database schema ready)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] OpenAPI spec generated and validated
- [ ] Integration tests for all endpoints (happy path + error cases)
- [ ] API documented in Swagger UI (accessible at /api/docs)

---

### 12.5 Sprint 3: Search Service Integration (Meilisearch)

**Duration:** 2 weeks

**Deliverables:**
1. Search module (NestJS): Meilisearch client integration
2. Index synchronization: building data syncs to Meilisearch on create/update/delete
3. Read-model synchronization: `search.building_locations` table populated via events for geospatial queries
4. Search endpoints: GET /search/buildings?q=... with filters, GET /search/buildings/map for map bounds queries
5. Event-driven sync: NATS events trigger Meilisearch updates AND read-model updates (or direct sync for MVP)
6. Search result ranking configuration (price, date, relevance)
7. Faceted search: aggregations for filters (price ranges, developers, regions)
8. **Service boundary enforcement:** Search Service does NOT query `listings.*` schema directly

**Acceptance Criteria:**
- [ ] Building created → indexed in Meilisearch (SLO: p95 < 10 seconds, p99 < 30 seconds)
- [ ] Building updated → Meilisearch index updated
- [ ] Building deleted → removed from Meilisearch index
- [ ] GET /search/buildings?q=apartment returns relevant results
- [ ] Search supports filters (price, area, location radius)
- [ ] Search results include highlights (matched text)
- [ ] Faceted search returns counts per filter option

**Dependencies:**
- Sprint 2 completed (listings CRUD working)
- NATS JetStream configured (Sprint 0)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Search latency < 100ms for typical queries
- [ ] Integration tests for search sync (create/update/delete)
- [ ] Search performance tested with 10K buildings

---

### 12.6 Sprint 4: Media Service (MinIO + Image Processing)

**Duration:** 2 weeks

**Deliverables:**
1. Media module (NestJS): MinIO client integration
2. Image upload endpoint: POST /media/upload (multipart/form-data)
3. Image processing worker: resize, generate thumbnails (sharp library)
4. Image storage: original + thumbnails (multiple sizes: 200x200, 400x400, 800x800, 1200x1200)
5. Image retrieval endpoints: GET /media/:id, GET /media/:id/thumbnail/:size
6. Media metadata storage (PostgreSQL: filename, size, mime type, dimensions, uploaded_at)
7. Image optimization: WebP conversion (optional, Phase 2)

**Acceptance Criteria:**
- [ ] POST /media/upload accepts image files (JPEG, PNG, WebP)
- [ ] Uploaded images stored in MinIO buckets
- [ ] Thumbnails generated automatically (4 sizes)
- [ ] GET /media/:id returns original image
- [ ] GET /media/:id/thumbnail/:size returns resized image
- [ ] Invalid file types rejected (400 error)
- [ ] File size limits enforced (ASSUMPTION: max 10MB per image)
- [ ] Image metadata stored in database

**Dependencies:**
- Sprint 0 completed (MinIO running)
- Sharp library installed

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Image processing tested (various formats, sizes)
- [ ] Upload performance: < 2s for 5MB image (including thumbnails)
- [ ] Integration tests for upload/retrieval

---

### 12.7 Sprint 5: Frontend - Building Listings & Filters

**Duration:** 2 weeks

**Deliverables:**
1. Nuxt 3 pages: `/buildings` (list), `/buildings/[id]` (detail)
2. Components: BuildingCard, BuildingList, FilterPanel, SortDropdown
3. Composables: `useBuildings`, `useFilters`, `usePagination`
4. Pinia store: `buildingsStore` (list, filters, pagination state)
5. API client: TypeScript client generated from OpenAPI spec
6. Filter UI: price range slider, area range, location selector, developer dropdown, commissioning date
7. Sort options: price (asc/desc), date (newest/oldest), area (asc/desc)
8. Pagination UI: page numbers or "Load More" button
9. Loading states: skeletons while fetching
10. Error handling: error messages displayed to user

**Acceptance Criteria:**
- [ ] `/buildings` page displays paginated building list
- [ ] Filters work: price, area, location, developer, commissioning date
- [ ] Sorting works: all sort options functional
- [ ] Pagination works: navigate between pages or load more
- [ ] Building cards show: image, title, price, area, location, developer
- [ ] Clicking building card navigates to detail page
- [ ] Loading skeletons shown during API calls
- [ ] Error messages displayed on API failures
- [ ] Responsive design: works on mobile, tablet, desktop

**Dependencies:**
- Sprint 2 completed (listings API ready)
- Sprint 4 completed (media API ready for images)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] E2E test: user can filter, sort, paginate buildings
- [ ] Performance: initial page load < 2s (SSR)
- [ ] Lighthouse score: Performance ≥ 80, Accessibility ≥ 90

---

### 12.8 Sprint 6: Frontend - Building Detail Page & Map View

**Duration:** 2 weeks

**Deliverables:**
1. Building detail page: `/buildings/[id]` with full information
2. Components: BuildingGallery, BuildingInfo, ContactSection, PriceRangeDisplay
3. Map component: Leaflet integration (client-only, SSR-safe)
4. Map markers: building location on map
5. Map clustering: cluster nearby buildings (when viewing map view of listings)
6. Currency toggle: AMD/USD switcher (with exchange rate API or config)
7. Image gallery: lightbox or carousel for building images
8. External links: developer website, social media links
9. "Add to Favorites" button (localStorage implementation)

**Acceptance Criteria:**
- [ ] Building detail page shows: address, price per m² range, "from price + area", updated date, floors, commissioning date, contacts, gallery, external links
- [ ] Map displays building location (marker)
- [ ] Map clustering works (when multiple buildings visible)
- [ ] Currency toggle switches prices between AMD and USD
- [ ] Exchange rate updates (ASSUMPTION: manual config or Central Bank API)
- [ ] Image gallery: click image to view full size
- [ ] "Add to Favorites" saves to localStorage
- [ ] Favorites persist across page refreshes
- [ ] Map loads only on client (no SSR errors)

**Dependencies:**
- Sprint 5 completed (building list page)
- Leaflet library installed
- Exchange rate source determined

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] E2E test: user can view building detail, toggle currency, add to favorites
- [ ] Map performance: renders 100 markers in < 1s
- [ ] SEO: detail page has proper meta tags, Open Graph tags

---

### 12.9 Sprint 7: Blog & Content Service

**Duration:** 2 weeks

**Deliverables:**
1. Content module (NestJS): CRUD for blog articles
2. Blog endpoints: GET /blog, GET /blog/:id, POST /blog, PUT /blog/:id, DELETE /blog/:id
3. Blog schema: title, slug, content (markdown or HTML), excerpt, featured image, published_at, author
4. Frontend: `/blog` (list), `/blog/[slug]` (article)
5. Components: BlogCard, BlogArticle, BlogList
6. Markdown rendering: convert markdown to HTML (or use rich text editor)
7. SEO: meta tags, Open Graph tags for blog articles
8. Pagination for blog list

**Acceptance Criteria:**
- [ ] GET /blog returns paginated list of published articles
- [ ] GET /blog/:id returns full article with content
- [ ] POST /blog creates article (admin only)
- [ ] Frontend `/blog` displays article cards with featured images
- [ ] Frontend `/blog/[slug]` displays full article with proper formatting
- [ ] Blog articles have SEO metadata (title, description, OG image)
- [ ] Markdown content renders correctly (headings, lists, links, images)

**Dependencies:**
- Sprint 2 completed (API Gateway pattern established)
- Media service ready (for featured images)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Integration tests for blog CRUD
- [ ] E2E test: user can browse blog, read article
- [ ] SEO: blog pages indexed by search engines (sitemap included)

---

### 12.10 Sprint 8: Mortgage Calculator & Submission Form

**Duration:** 2 weeks

**Deliverables:**
1. Mortgage calculator endpoint: POST /calculator/mortgage (loan amount, interest rate, term → monthly payment)
2. Frontend calculator: `/calculator` page with form inputs
3. Calculator component: input fields (loan amount, interest rate %, term in years), calculate button, result display
4. Calculation logic: monthly payment formula (with amortization breakdown optional)
5. "Add building" submission form: `/submit-building` page
6. Submission endpoint: POST /buildings/submit (public, creates pending submission)
7. Submission schema: building data (name, address, developer, contacts, images), submitter info (name, email, phone)
8. Email notification: admin notified of new submission (optional, Phase 2 if email service not ready)
9. Admin: view pending submissions, approve/reject

**Acceptance Criteria:**
- [ ] Mortgage calculator calculates monthly payment correctly
- [ ] Calculator handles edge cases: zero interest, very long terms
- [ ] Submission form accepts building data and images
- [ ] POST /buildings/submit creates pending submission
- [ ] Admin can view pending submissions
- [ ] Admin can approve submission (creates building) or reject
- [ ] Form validation: required fields, email format, phone format

**Dependencies:**
- Sprint 2 completed (buildings API)
- Email service (optional, can use console log for MVP)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Calculator tested with various inputs (unit tests)
- [ ] E2E test: user submits building, admin approves
- [ ] Form validation errors displayed clearly

---

### 12.11 Sprint 9: Analytics Service & Event Tracking

**Duration:** 2 weeks

**Deliverables:**
1. Analytics module (NestJS): event ingestion endpoint POST /analytics/events
2. Event schema: event_type (view, contact_click, call_click, favorite_add), entity_type (building, blog), entity_id, user_id (optional), timestamp, metadata
3. Event storage: PostgreSQL table (analytics_events) with indexes on entity_id, event_type, timestamp
4. Aggregation queries: views per building, clicks per building, popular buildings (top N)
5. Analytics dashboard API: GET /analytics/buildings/:id/stats (views, clicks, trends)
6. Frontend tracking: composable `useAnalytics` to track events
7. Track events: building view, contact click, call click, favorite add
8. Admin dashboard: basic analytics view (views per building, clicks, top buildings)

**Acceptance Criteria:**
- [ ] POST /analytics/events accepts event payloads
- [ ] Building view tracked when detail page loaded
- [ ] Contact click tracked when user clicks phone/email
- [ ] Call click tracked when user clicks call button
- [ ] GET /analytics/buildings/:id/stats returns aggregated stats
- [ ] Admin dashboard displays building analytics
- [ ] Events stored with proper timestamps and metadata
- [ ] Analytics queries performant (< 500ms for aggregations)

**Dependencies:**
- Sprint 5 completed (frontend pages ready for tracking)
- Sprint 2 completed (buildings API)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Integration tests for event ingestion
- [ ] Analytics queries tested with 100K events
- [ ] Privacy: no PII stored (or anonymized)

---

### 12.12 Sprint 10: Admin Panel - CRUD Operations

**Duration:** 2 weeks

**Deliverables:**
1. Admin authentication: JWT-based auth (or session-based)
2. RBAC: admin role, permissions (buildings:create, buildings:update, buildings:delete, blog:create, etc.)
3. Admin endpoints: all CRUD operations protected with @Roles('admin') decorator
4. Admin frontend: `/admin` section (protected routes)
5. Admin pages: `/admin/buildings` (list, create, edit), `/admin/blog` (list, create, edit), `/admin/media` (upload, manage)
6. Admin components: BuildingForm, BlogForm, MediaUploader, DataTable
7. Form validation: client-side and server-side
8. Image upload in admin: drag-and-drop or file picker
9. Rich text editor: for blog content (TinyMCE, Quill, or similar)

**Acceptance Criteria:**
- [ ] Admin login: POST /auth/admin/login (username/password)
- [ ] Admin routes protected: redirect to login if not authenticated
- [ ] Admin can create/edit/delete buildings
- [ ] Admin can create/edit/delete blog articles
- [ ] Admin can upload images and assign to buildings
- [ ] Form validation prevents invalid data
- [ ] Admin can publish/unpublish buildings and blog articles
- [ ] Audit log: admin actions logged (who, what, when)

**Dependencies:**
- Sprint 2 completed (buildings API)
- Sprint 7 completed (blog API)
- Sprint 4 completed (media API)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] E2E test: admin logs in, creates building, edits, deletes
- [ ] Security: admin endpoints require authentication + authorization
- [ ] Audit logs stored and queryable

---

### 12.13 Sprint 11: i18n & SEO Optimization

**Duration:** 2 weeks

**Deliverables:**
1. i18n setup: nuxt/i18n configured for AM/RU/EN
2. Translation files: all UI text translated (buttons, labels, error messages, building fields)
3. Language switcher: component to switch between AM/RU/EN
4. SEO: sitemap.xml generation (dynamic, includes buildings and blog)
5. SEO: robots.txt
6. SEO: canonical URLs for all pages
7. SEO: meta tags (title, description) for all pages (dynamic based on content)
8. SEO: Open Graph tags for building detail and blog articles
9. SEO: structured data (JSON-LD) for buildings (Schema.org RealEstateAgent)
10. SEO: pagination meta tags (rel="next", rel="prev")
11. Performance: Nuxt Image component for optimized images
12. Performance: lazy loading for images and components

**Acceptance Criteria:**
- [ ] Language switcher works: user can switch between AM/RU/EN
- [ ] All UI text displays in selected language
- [ ] Building data supports multi-language (name, description, address)
- [ ] Sitemap.xml generated and accessible at /sitemap.xml
- [ ] Robots.txt configured
- [ ] All pages have canonical URLs
- [ ] Building detail pages have proper meta tags and OG tags
- [ ] Blog articles have proper meta tags and OG tags
- [ ] Structured data validates (Google Rich Results Test)
- [ ] Images optimized (WebP, responsive sizes)
- [ ] Lazy loading works: images load on scroll

**Dependencies:**
- All frontend pages completed (Sprints 5-9)
- Translation content provided (ASSUMPTION: translations available)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] SEO audit: Lighthouse SEO score ≥ 95
- [ ] i18n tested: all languages display correctly
- [ ] Sitemap validated: all URLs accessible

---

### 12.14 Sprint 12: Eventing & Outbox Pattern

**Duration:** 2 weeks

**Deliverables:**
1. Outbox table: PostgreSQL table for outbox events (id, event_type, payload, status, created_at, processed_at)
2. Outbox processor: background job that reads outbox and publishes to NATS
3. Event publishing: wrap critical operations (building created/updated/deleted) with outbox
4. NATS JetStream: streams and consumers configured
5. Event consumers: search service consumes building events to update Meilisearch
6. Idempotency: idempotency keys for event processing
7. Retry logic: exponential backoff for failed event processing
8. DLQ: dead letter queue for poison messages (failed after N retries)
9. Event catalog: document all events (name, payload schema, producer, consumers)
10. Alerting: configure alerts for event processing failures (SLO violations, DLQ growth)
11. Reindex strategy: document and implement procedure for reindexing Meilisearch when events are missed or corrupted

**Acceptance Criteria:**
- [ ] Building created → outbox event created → published to NATS → search service updates Meilisearch
- [ ] Outbox processor runs every 5 seconds (or configurable interval)
- [ ] Failed events retried with exponential backoff (max 3 retries)
- [ ] Poison messages moved to DLQ after max retries
- [ ] Idempotency: duplicate events ignored (based on idempotency key)
- [ ] Event processing SLO: p95 latency < 10 seconds for Meilisearch index updates (p99 < 30 seconds). Alerting configured for failures. Reindex strategy documented for missed events.

**Dependencies:**
- Sprint 3 completed (search service)
- Sprint 2 completed (listings service)
- NATS JetStream configured (Sprint 0)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Integration test: event flow from creation to Meilisearch update
- [ ] DLQ tested: poison message handling verified
- [ ] Event catalog documented

---

### 12.15 Sprint 13: Observability & Monitoring

**Duration:** 2 weeks

**Deliverables:**
1. OpenTelemetry setup: tracing instrumentation (NestJS, Nuxt 3)
2. Tracing: spans for API requests, database queries, external calls
3. Metrics: Prometheus metrics (request count, latency, error rate, database query time)
4. Logging: structured logging (Winston or Pino) with correlation IDs
5. Log aggregation: Loki configured (or equivalent)
6. Dashboards: Grafana dashboards for API metrics, database performance, error rates
7. Alerts: critical error alerts (5xx errors > threshold, database connection failures)
8. Health checks: /health endpoint for all services
9. Frontend monitoring: error tracking (Sentry or equivalent, optional)

**Acceptance Criteria:**
- [ ] API requests traced: full request lifecycle visible in traces
- [ ] Metrics exported to Prometheus: queryable via PromQL
- [ ] Logs aggregated: searchable by correlation ID, timestamp, level
- [ ] Grafana dashboards show: request rate, latency (p50, p95, p99), error rate
- [ ] Alerts configured: notify on critical errors
- [ ] Health checks return service status (database, Redis, NATS connectivity)

**Dependencies:**
- All services implemented (Sprints 2-12)
- Prometheus, Grafana, Loki deployed (or cloud equivalent)

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Tracing tested: trace spans visible in Jaeger/Tempo
- [ ] Dashboards reviewed: key metrics visible
- [ ] Alerting tested: alerts fire on simulated errors

---

### 12.16 Sprint 14: Security Hardening & Performance Optimization

**Duration:** 2 weeks

**Deliverables:**
1. Security: Helmet middleware configured (CSP, HSTS, XSS protection)
2. Security: CORS configured (allowed origins, methods, headers)
3. Security: rate limiting (Redis-based, per IP, per endpoint)
4. Security: input validation (all endpoints validate input with class-validator)
5. Security: SQL injection prevention (parameterized queries verified)
6. Security: XSS prevention (output encoding, CSP headers)
7. Security: audit logs for admin actions (who, what, when, IP)
8. Performance: database query optimization (slow query log analysis, index tuning)
9. Performance: Redis caching for frequently accessed data (building lists, search results)
10. Performance: CDN setup for static assets (or MinIO public URLs)
11. Performance: API response compression (gzip)
12. Security: dependency vulnerability scanning (npm audit, Snyk)

**Acceptance Criteria:**
- [ ] Helmet headers present on all responses
- [ ] CORS allows only specified origins
- [ ] Rate limiting: 100 requests/minute per IP (configurable)
- [ ] All user inputs validated (no invalid data accepted)
- [ ] SQL injection test: malicious inputs rejected
- [ ] XSS test: script tags in input do not execute
- [ ] Audit logs: all admin actions logged
- [ ] Database queries optimized: no queries > 500ms (except aggregations)
- [ ] Caching: building list cached for 5 minutes (configurable)
- [ ] API responses compressed (gzip)
- [ ] No critical vulnerabilities in dependencies

**Dependencies:**
- All services implemented
- Security audit tools available

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Security scan: no critical/high vulnerabilities
- [ ] Performance test: API handles 100 req/s (p95 latency < 500ms)
- [ ] Rate limiting tested: excessive requests blocked

---

### 12.17 Sprint 15: Testing & Bug Fixes

**Duration:** 2 weeks

**Deliverables:**
1. Unit test coverage: ≥ 70% for all services
2. Integration tests: all API endpoints tested (happy path + error cases)
3. Contract tests: API Gateway ↔ Services contracts verified
4. E2E tests: critical user flows (browse buildings, view detail, add favorite, submit building)
5. Performance tests: load testing (100 concurrent users, 5-minute duration)
6. Bug fixes: all P0 and P1 bugs fixed
7. Documentation: API documentation complete (OpenAPI specs)
8. Documentation: deployment guide written
9. Documentation: runbook for common operations

**Acceptance Criteria:**
- [ ] Unit test coverage ≥ 70% (all services)
- [ ] Integration tests cover all endpoints
- [ ] Contract tests pass: API contracts match implementations
- [ ] E2E tests: 5+ critical user flows automated
- [ ] Performance: API handles 100 req/s without degradation
- [ ] No P0 bugs (blocking issues)
- [ ] No P1 bugs (critical, but workarounds exist)
- [ ] API docs complete: all endpoints documented with examples
- [ ] Deployment guide: step-by-step instructions for dev/stage/prod

**Dependencies:**
- All features implemented (Sprints 1-14)
- Test infrastructure ready

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Test report generated: coverage, pass/fail rates
- [ ] Performance test report: latency, throughput, error rates
- [ ] Bug tracker: all P0/P1 bugs resolved

---

### 12.18 Sprint 16: MVP Deployment & Launch Preparation

**Duration:** 2 weeks

**Deliverables:**
1. Production environment: infrastructure provisioned (Kubernetes or VPS)
2. Database: production PostgreSQL + PostGIS setup, backups configured
3. Secrets management: environment variables, API keys stored securely
4. Deployment: CI/CD pipeline deploys to production
5. Monitoring: production dashboards and alerts active
6. Backup/restore: tested backup and restore procedures
7. Documentation: production runbook, incident response plan
8. Launch checklist: all MVP features verified in production
9. Rollback plan: procedure to rollback deployment if issues arise
10. Post-launch support plan: monitoring, bug triage process

**Acceptance Criteria:**
- [ ] Production environment accessible (domain configured, SSL certificates)
- [ ] Database backups run daily (verified restore tested)
- [ ] CI/CD deploys to production successfully
- [ ] Monitoring dashboards show healthy metrics
- [ ] All MVP features work in production
- [ ] Performance: production handles expected load (ASSUMPTION: 1K daily active users initially)
- [ ] Security: production hardened (no default credentials, firewall rules)
- [ ] Rollback tested: can revert to previous version if needed

**Dependencies:**
- All previous sprints completed
- Production infrastructure access
- Domain and SSL certificates

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] Production smoke tests pass
- [ ] Launch checklist signed off by product/tech lead
- [ ] Support team briefed on monitoring and incident response

---

### 12.19 Phase 2 Milestones (Post-MVP)

**Note:** Phase 2 milestones are high-level. Detailed sprint planning should be done after MVP launch and user feedback.

**Sprint 17-18: User Authentication & Enhanced Favorites**
- JWT-based authentication (OIDC optional)
- User registration/login
- Favorites sync across devices (migrate from localStorage)
- User profile page

**Sprint 19-20: Advanced Filters & Saved Searches**
- Floor selection, parking, amenities filters
- Saved searches with email notifications
- Search history

**Sprint 21-22: Comparison Tool & Developer Profiles**
- Side-by-side building comparison (3-4 buildings)
- Developer profile pages with portfolio
- Developer contact forms

**Sprint 23-24: Enhanced Analytics & Admin Features**
- Heatmaps, conversion funnels
- Bulk operations (admin)
- Import/export (CSV)
- Advanced reporting

---

### 12.20 Milestone Summary Table

| Sprint | Focus Area | Key Deliverables | Dependencies |
|--------|------------|------------------|--------------|
| 0 | Foundation | Repo, Docker, CI/CD skeleton | None |
| 1 | Data Model | Database schemas, migrations, seeds | Sprint 0 |
| 2 | Listings API | CRUD endpoints, API Gateway | Sprint 1 |
| 3 | Search | Meilisearch integration, sync | Sprint 2 |
| 4 | Media | MinIO, image processing | Sprint 0 |
| 5 | Frontend Listings | Building list, filters, pagination | Sprint 2, 4 |
| 6 | Frontend Detail | Detail page, map, currency toggle | Sprint 5 |
| 7 | Blog | Content service, blog pages | Sprint 2 |
| 8 | Calculator & Form | Mortgage calc, submission form | Sprint 2 |
| 9 | Analytics | Event tracking, dashboard | Sprint 5, 2 |
| 10 | Admin Panel | Admin CRUD, auth, RBAC | Sprint 2, 7, 4 |
| 11 | i18n & SEO | Translations, sitemap, meta tags | All frontend |
| 12 | Eventing | Outbox, NATS, idempotency | Sprint 3, 2 |
| 13 | Observability | Tracing, metrics, logs | All services |
| 14 | Security & Performance | Hardening, optimization | All services |
| 15 | Testing | Unit, integration, E2E, load tests | All features |
| 16 | Deployment | Production setup, launch | All sprints |

**Total MVP Duration:** 16 sprints (32 weeks / ~8 months)

**ASSUMPTION:** Team works full-time. If part-time or smaller team, duration will increase proportionally.

---

### 12.21 Risk Mitigation & Contingency Planning

**High-Risk Areas:**
1. **PostGIS Complexity:** Spatial queries may be slower than expected
   - *Mitigation:* Early performance testing in Sprint 1, index optimization
   - *Contingency:* Simplify location filters (bounding box only, no complex polygons)

2. **Meilisearch Sync Delays:** Event-driven sync may have consistency issues
   - *Mitigation:* Outbox pattern ensures at-least-once delivery
   - *Contingency:* Fallback to direct sync for critical updates

3. **Image Processing Bottleneck:** Large images may slow uploads
   - *Mitigation:* Async processing, queue-based workers
   - *Contingency:* Client-side image compression before upload

4. **i18n Content Delay:** Translations may not be ready in time
   - *Mitigation:* Start translation work early (parallel to development)
   - *Contingency:* Launch with EN/RU first, add AM later

5. **Performance Under Load:** Production may not handle expected traffic
   - *Mitigation:* Load testing in Sprint 15, caching strategy
   - *Contingency:* Scale horizontally (add instances), optimize queries

**ASSUMPTION:** Risks are identified early, and mitigation strategies are implemented proactively. Contingency plans are documented and ready to execute if needed.

---

### 12.22 Success Criteria for MVP Launch

**Functional:**
- [ ] All MVP features implemented and working
- [ ] No P0 or P1 bugs
- [ ] Performance: API p95 latency < 500ms
- [ ] Uptime: 99% availability (excluding planned maintenance)

**Non-Functional:**
- [ ] SEO: Lighthouse SEO score ≥ 95
- [ ] Security: No critical vulnerabilities
- [ ] Observability: All services monitored, alerts configured
- [ ] Documentation: API docs, deployment guide, runbook complete

**Business:**
- [ ] Can list and browse new buildings
- [ ] Can view building details with map
- [ ] Can search and filter buildings
- [ ] Can submit new building suggestions
- [ ] Admin can manage buildings and blog
- [ ] Analytics tracking functional

**ASSUMPTION:** MVP launch is considered successful when all functional and non-functional criteria are met, and the system is stable in production for at least 1 week.

---

## 13. Verification Checklist

This checklist is designed for reviewers (tech leads, architects, QA, product owners) to validate the completeness and correctness of the implementation against the requirements defined in this README.

**Priority Legend:**
- **P0 (Critical):** Must be completed before MVP launch. Blocks production deployment.
- **P1 (Important):** Should be completed before MVP launch. May have workarounds.
- **P2 (Nice-to-have):** Can be deferred to Phase 2 or post-MVP.

---

### 13.1 Architecture & Design Verification

#### 13.1.1 Architecture Decision
- [ ] **P0** Architecture pattern chosen (Modular Monolith vs Microservices) is documented with justification
- [ ] **P0** Target microservices decomposition is documented (even if starting as monolith)
- [ ] **P1** Migration path from monolith to microservices is outlined (if applicable)
- [ ] **P1** Service boundaries are clearly defined with responsibilities
- [ ] **P2** Architecture decision records (ADRs) are maintained for major choices

#### 13.1.2 Technology Stack Compliance
- [ ] **P0** Backend uses NestJS (TypeScript) with microservices-first mindset
- [ ] **P0** Frontend uses Nuxt 3 (TypeScript) with SSR enabled
- [ ] **P0** PostgreSQL + PostGIS is used for spatial data
- [ ] **P0** NATS JetStream is used as message broker
- [ ] **P0** Meilisearch is used for search functionality
- [ ] **P0** Redis is used for cache and rate limiting
- [ ] **P0** MinIO (S3-compatible) is used for media storage
- [ ] **P1** OpenTelemetry is integrated for observability
- [ ] **P1** OpenAPI/Swagger is used for contract-first API design

---

### 13.2 Backend Implementation Verification

#### 13.2.1 Core Services
- [ ] **P0** API Gateway / BFF service is implemented and routes requests correctly
- [ ] **P0** Listings service handles buildings CRUD operations
- [ ] **P0** Search service syncs with Meilisearch and handles queries
- [ ] **P0** Media service handles uploads, processing, and storage (MinIO)
- [ ] **P0** Content service handles blog/articles (or headless CMS integration)
- [ ] **P1** Analytics service ingests events and aggregates metrics
- [ ] **P1** Auth service implements JWT/OIDC (if Phase 2)

#### 13.2.2 Database & Data Model
- [ ] **P0** Database isolation: MVP uses schema-per-module in ONE shared PostgreSQL instance (strict ownership, no cross-schema queries). Target architecture is microservices with DB-per-service.
- [ ] **P0** PostGIS extension is enabled and spatial queries work
- [ ] **P0** Database migrations are versioned and reversible
- [ ] **P0** Required indexes are created (including PostGIS spatial indexes)
- [ ] **P0** Composite indexes exist for common query patterns
- [ ] **P0** PricingSnapshots table tracks price history
- [ ] **P0** Multi-language fields strategy is implemented (JSONB or separate tables)
- [ ] **P1** Database seed scripts exist for development
- [ ] **P1** Foreign key constraints are properly defined
- [ ] **P2** Database backup and restore procedures are tested

#### 13.2.3 API Contracts
- [ ] **P0** All public endpoints are documented in OpenAPI/Swagger
- [ ] **P0** All admin endpoints are documented in OpenAPI/Swagger
- [ ] **P0** API versioning strategy is implemented (e.g., `/v1/`)
- [ ] **P0** Pagination follows consistent format (cursor or offset-based)
- [ ] **P0** Sorting conventions are consistent across endpoints
- [ ] **P0** Error responses follow standard format (status code + error object)
- [ ] **P0** Request/response validation is implemented (class-validator)
- [ ] **P1** OpenAPI client generation is tested and working
- [ ] **P1** API rate limiting is configured per endpoint
- [ ] **P2** API deprecation policy is documented

#### 13.2.4 Eventing & Messaging
- [ ] **P0** NATS JetStream is configured and accessible
- [ ] **P0** Event catalog is documented (event names + payload examples)
- [ ] **P0** Outbox pattern is implemented for at-least-once delivery
- [ ] **P0** Idempotency keys are used for critical operations
- [ ] **P0** Retry policies are configured for failed messages
- [ ] **P0** Dead Letter Queue (DLQ) is configured for poison messages
- [ ] **P0** Event producers emit events after database commits
- [ ] **P0** Event consumers handle duplicate messages gracefully
- [ ] **P1** Event schema versioning strategy is documented
- [ ] **P1** Event replay capability exists for recovery scenarios
- [ ] **P2** Event ordering guarantees are documented per event type

#### 13.2.5 Security
- [ ] **P0** Helmet middleware is configured for security headers
- [ ] **P0** CORS is properly configured (not permissive in production)
- [ ] **P0** Input validation is enforced on all endpoints
- [ ] **P0** SQL injection prevention (parameterized queries, ORM)
- [ ] **P0** XSS prevention (sanitization, CSP headers)
- [ ] **P0** RBAC is implemented for admin endpoints
- [ ] **P0** Audit logs record admin actions (who, what, when)
- [ ] **P0** Secrets are not hardcoded (use environment variables or secret manager)
- [ ] **P1** Rate limiting is configured (per IP, per user)
- [ ] **P1** Authentication tokens expire and refresh properly
- [ ] **P1** Password hashing uses bcrypt/argon2 (if applicable)
- [ ] **P2** Security headers audit (HSTS, CSP, X-Frame-Options, etc.)
- [ ] **P2** Dependency vulnerability scanning is automated

---

### 13.3 Frontend Implementation Verification

#### 13.3.1 Nuxt 3 Setup
- [ ] **P0** Nuxt 3 is configured with SSR enabled
- [ ] **P0** TypeScript is properly configured (no `any` types in critical paths)
- [ ] **P0** Pinia stores are set up for state management
- [ ] **P0** nuxt/i18n is configured for AM/RU/EN languages
- [ ] **P0** All three languages have translations (or placeholders)
- [ ] **P1** Nuxt Image module is configured for image optimization
- [ ] **P1** Error handling and error pages are implemented
- [ ] **P2** Nuxt DevTools are available in development

#### 13.3.2 Routes & Pages
- [ ] **P0** Building listing page exists (`/buildings` or `/`)
- [ ] **P0** Building detail page exists (`/buildings/:id`)
- [ ] **P0** Blog listing page exists (`/blog`)
- [ ] **P0** Blog article page exists (`/blog/:slug`)
- [ ] **P0** Mortgage calculator page exists (`/calculator`)
- [ ] **P0** Submission form page exists (`/submit`)
- [ ] **P0** Admin panel routes exist (protected by auth)
- [ ] **P1** 404 page exists and is styled
- [ ] **P1** 500 error page exists and is styled
- [ ] **P2** Sitemap is generated automatically (`/sitemap.xml`)

#### 13.3.3 Features
- [ ] **P0** Building list displays with pagination
- [ ] **P0** Filters work (price range, location, area, etc.)
- [ ] **P0** Sorting works (price, date, area)
- [ ] **P0** Map view displays with markers
- [ ] **P0** Map clustering works for dense areas
- [ ] **P0** Currency toggle (AMD/USD) works with correct rounding
- [ ] **P0** Building detail shows all required fields (address, price range, area, dates, contacts, gallery)
- [ ] **P0** Favorites functionality works (localStorage for anonymous users)
- [ ] **P0** Mortgage calculator calculates correctly
- [ ] **P0** Submission form validates and submits data
- [ ] **P0** Blog articles render with proper formatting
- [ ] **P1** Search autocomplete works (if implemented)
- [ ] **P1** Image gallery has lightbox/zoom functionality
- [ ] **P2** Comparison tool works (if Phase 2)

#### 13.3.4 Map Implementation
- [ ] **P0** Leaflet (or equivalent) is integrated
- [ ] **P0** Map is client-only (no SSR errors)
- [ ] **P0** Map markers display building locations correctly
- [ ] **P0** Map clustering groups nearby markers
- [ ] **P0** Clicking marker navigates to building detail
- [ ] **P0** Map bounds filter updates building list
- [ ] **P1** Map supports different tile providers
- [ ] **P1** Map performance is acceptable with 100+ markers
- [ ] **P2** Map supports custom markers/icons

#### 13.3.5 SEO
- [ ] **P0** Meta tags are set per page (title, description)
- [ ] **P0** Open Graph tags are set per page
- [ ] **P0** Canonical URLs are set per page
- [ ] **P0** Structured data (JSON-LD) is present for buildings
- [ ] **P0** Sitemap is generated and accessible
- [ ] **P0** Robots.txt is configured
- [ ] **P0** Language alternates (hreflang) are set for i18n
- [ ] **P1** Lighthouse SEO score ≥ 95
- [ ] **P1** All images have alt text
- [ ] **P1** URLs are SEO-friendly (no query params for main routes)
- [ ] **P2** XML sitemap includes lastmod dates
- [ ] **P2** RSS feed exists for blog (if applicable)

#### 13.3.6 Performance
- [ ] **P0** Images are lazy-loaded below the fold
- [ ] **P0** Images are optimized (WebP, responsive sizes)
- [ ] **P0** Code splitting is working (route-based)
- [ ] **P0** Skeleton loaders are shown during data fetching
- [ ] **P1** Lighthouse Performance score ≥ 90
- [ ] **P1** First Contentful Paint (FCP) < 1.8s
- [ ] **P1** Largest Contentful Paint (LCP) < 2.5s
- [ ] **P1** Time to Interactive (TTI) < 3.8s
- [ ] **P1** API responses are cached where appropriate
- [ ] **P2** Service Worker is implemented (PWA features)
- [ ] **P2** Critical CSS is inlined

#### 13.3.7 i18n
- [ ] **P0** Language switcher is visible and functional
- [ ] **P0** All three languages (AM/RU/EN) are supported
- [ ] **P0** URLs include language prefix (e.g., `/en/buildings`, `/ru/buildings`)
- [ ] **P0** Default language redirects work
- [ ] **P0** Currency formatting respects locale (AMD vs USD)
- [ ] **P0** Date formatting respects locale
- [ ] **P1** All user-facing text is translated (no hardcoded strings)
- [ ] **P1** Missing translations show fallback (not empty)
- [ ] **P2** RTL support is considered (if needed for AM)

---

### 13.4 Observability & Monitoring Verification

#### 13.4.1 Tracing
- [ ] **P0** OpenTelemetry is integrated in all services
- [ ] **P0** Traces are collected and sent to backend (Tempo/Jaeger)
- [ ] **P0** Distributed tracing works across services
- [ ] **P1** Trace sampling is configured (not 100% in production)
- [ ] **P1** Custom spans are added for critical operations
- [ ] **P2** Trace correlation IDs are included in logs

#### 13.4.2 Logging
- [ ] **P0** Structured logging is implemented (JSON format)
- [ ] **P0** Logs include correlation IDs
- [ ] **P0** Log levels are appropriate (ERROR, WARN, INFO, DEBUG)
- [ ] **P0** Logs are aggregated (Loki or equivalent)
- [ ] **P1** Sensitive data is not logged (passwords, tokens, PII)
- [ ] **P1** Log retention policy is configured
- [ ] **P2** Log querying and filtering works in Grafana

#### 13.4.3 Metrics
- [ ] **P0** Prometheus metrics are exposed per service
- [ ] **P0** Key metrics are collected (request rate, latency, error rate)
- [ ] **P0** Business metrics are tracked (building views, contact clicks)
- [ ] **P0** Grafana dashboards exist for each service
- [ ] **P1** Custom metrics are defined for business KPIs
- [ ] **P1** Alert rules are configured for critical thresholds
- [ ] **P2** Metrics retention policy is configured

#### 13.4.4 Health Checks
- [ ] **P0** Health check endpoint exists per service (`/health`)
- [ ] **P0** Health checks verify database connectivity
- [ ] **P0** Health checks verify external dependencies (NATS, Redis, MinIO, Meilisearch)
- [ ] **P1** Readiness probe is separate from liveness probe
- [ ] **P1** Health checks are used by load balancer/orchestrator

---

### 13.5 Testing Verification

#### 13.5.1 Unit Tests
- [ ] **P0** Critical business logic has unit tests (coverage > 70%)
- [ ] **P0** Utility functions have unit tests
- [ ] **P0** Test coverage report is generated
- [ ] **P1** Test coverage > 80% for critical paths
- [ ] **P2** Test coverage > 90% for all code

#### 13.5.2 Integration Tests
- [ ] **P0** API endpoints have integration tests
- [ ] **P0** Database operations are tested (with test DB)
- [ ] **P0** Event publishing/consuming is tested
- [ ] **P0** External service integrations are mocked or tested
- [ ] **P1** Integration tests run in CI/CD pipeline
- [ ] **P2** Integration tests cover error scenarios

#### 13.5.3 Contract Tests
- [ ] **P0** API Gateway contracts are tested against service APIs
- [ ] **P0** Event contracts are validated (schema validation)
- [ ] **P1** Contract tests prevent breaking changes
- [ ] **P2** Contract tests are generated from OpenAPI specs

#### 13.5.4 End-to-End Tests
- [ ] **P0** Critical user flows have E2E tests (Playwright/Cypress)
- [ ] **P0** E2E tests cover: browse buildings, view detail, submit form
- [ ] **P1** E2E tests cover admin flows (CRUD operations)
- [ ] **P1** E2E tests run in CI/CD pipeline
- [ ] **P2** E2E tests cover mobile viewport

#### 13.5.5 Performance Tests
- [ ] **P1** Load tests exist for critical endpoints
- [ ] **P1** Load tests verify system handles expected load (ASSUMPTION: 1K daily users)
- [ ] **P1** Database query performance is tested (slow query log reviewed)
- [ ] **P2** Stress tests identify breaking points
- [ ] **P2** Performance regression tests are automated

---

### 13.6 Deployment & Infrastructure Verification

#### 13.6.1 Local Development
- [ ] **P0** `docker-compose up` starts all services successfully
- [ ] **P0** All environment variables are documented
- [ ] **P0** Local setup instructions are clear and tested
- [ ] **P0** Database migrations run automatically on startup
- [ ] **P1** Seed data is available for development
- [ ] **P1** Hot reload works for development
- [ ] **P2** Local SSL certificates work (for HTTPS testing)

#### 13.6.2 CI/CD
- [ ] **P0** CI pipeline runs tests on every commit
- [ ] **P0** CI pipeline builds Docker images
- [ ] **P0** CI pipeline fails on test failures
- [ ] **P0** CD pipeline deploys to staging automatically
- [ ] **P0** CD pipeline requires approval for production
- [ ] **P1** CI pipeline runs linting and type checking
- [ ] **P1** CI pipeline runs security scans
- [ ] **P1** Docker images are tagged with version/sha
- [ ] **P2** CI pipeline runs performance smoke tests

#### 13.6.3 Environments
- [ ] **P0** Development environment is accessible
- [ ] **P0** Staging environment mirrors production
- [ ] **P0** Production environment is configured
- [ ] **P0** Environment variables are managed securely (not in code)
- [ ] **P1** Environment-specific configs are documented
- [ ] **P2** Blue-green or canary deployment is possible

#### 13.6.4 Database Migrations
- [ ] **P0** Migrations are versioned and reversible
- [ ] **P0** Migrations run automatically on deployment
- [ ] **P0** Migration rollback is tested
- [ ] **P1** Migration strategy is documented (per-service)
- [ ] **P2** Zero-downtime migration strategy is tested

#### 13.6.5 Backup & Recovery
- [ ] **P0** Database backup strategy is documented
- [ ] **P0** Backup restoration is tested
- [ ] **P1** Automated backups run daily
- [ ] **P1** Backup retention policy is defined
- [ ] **P2** Disaster recovery plan is documented

---

### 13.7 Documentation Verification

#### 13.7.1 Technical Documentation
- [ ] **P0** README.md is complete and up-to-date
- [ ] **P0** API documentation is generated from OpenAPI specs
- [ ] **P0** Architecture diagrams exist (or text descriptions)
- [ ] **P0** Database schema is documented (ERD or text)
- [ ] **P0** Event catalog is documented
- [ ] **P1** Deployment guide exists
- [ ] **P1** Development setup guide exists
- [ ] **P1** Runbook exists for common operations
- [ ] **P2** ADRs (Architecture Decision Records) are maintained

#### 13.7.2 Code Documentation
- [ ] **P1** Complex functions have JSDoc comments
- [ ] **P1** API endpoints have inline documentation
- [ ] **P1** Event payloads have schema documentation
- [ ] **P2** Code examples exist for common use cases

---

### 13.8 Functional Requirements Verification

#### 13.8.1 MVP Features
- [ ] **P0** Users can browse new buildings with filters
- [ ] **P0** Users can view building details with map
- [ ] **P0** Users can search buildings (Meilisearch)
- [ ] **P0** Users can toggle currency (AMD/USD)
- [ ] **P0** Users can view blog articles
- [ ] **P0** Users can use mortgage calculator
- [ ] **P0** Users can submit new building suggestions
- [ ] **P0** Users can save favorites (localStorage)
- [ ] **P0** Analytics track views and contact clicks
- [ ] **P0** Admin can CRUD buildings
- [ ] **P0** Admin can CRUD blog articles
- [ ] **P0** Admin can upload/manage media

#### 13.8.2 Data Accuracy
- [ ] **P0** Building prices are accurate and up-to-date
- [ ] **P0** Building locations are accurate (PostGIS coordinates)
- [ ] **P0** Currency conversion is correct (with rounding rules)
- [ ] **P0** Date formatting is correct (commissioning dates, updated dates)
- [ ] **P1** Price history is tracked (PricingSnapshots)
- [ ] **P2** Data quality checks are automated

---

### 13.9 Non-Functional Requirements Verification

#### 13.9.1 Performance
- [ ] **P0** API p95 latency < 500ms (for non-search endpoints)
- [ ] **P0** Search queries complete < 1s
- [ ] **P0** Page load time < 3s (first load)
- [ ] **P1** API p99 latency < 1s
- [ ] **P1** Database queries are optimized (no N+1 queries)
- [ ] **P2** CDN is configured for static assets

#### 13.9.2 Scalability
- [ ] **P1** System can handle 1K daily active users (ASSUMPTION)
- [ ] **P1** Horizontal scaling is possible (stateless services)
- [ ] **P2** Load testing confirms scalability assumptions

#### 13.9.3 Availability
- [ ] **P0** System uptime target is defined (99% for MVP)
- [ ] **P0** Health checks enable automatic recovery
- [ ] **P1** Graceful degradation is implemented (fallbacks)
- [ ] **P2** Multi-region deployment is possible (future)

#### 13.9.4 Security
- [ ] **P0** No critical security vulnerabilities (OWASP Top 10)
- [ ] **P0** Dependencies are scanned for vulnerabilities
- [ ] **P0** HTTPS is enforced in production
- [ ] **P1** Security headers are configured (Helmet)
- [ ] **P1** Rate limiting prevents abuse
- [ ] **P2** Penetration testing is performed

---

### 13.10 Legal & IP Verification

- [ ] **P0** All content (text, images) is original or properly licensed
- [ ] **P0** No copyrighted material is used without permission
- [ ] **P0** Branding is original (not copied from Norakaruyc)
- [ ] **P0** Design is original (not copied from Norakaruyc)
- [ ] **P1** Terms of service and privacy policy exist
- [ ] **P2** GDPR compliance is considered (if applicable)

---

### 13.11 Review Sign-Off

**Reviewer Information:**
- Reviewer Name: ________________
- Review Date: ________________
- Review Type: [ ] Architecture Review [ ] Code Review [ ] Pre-Launch Review [ ] Other: ________

**Overall Assessment:**
- [ ] **P0 Items:** All P0 items are complete
- [ ] **P1 Items:** All P1 items are complete (or documented exceptions)
- [ ] **P2 Items:** P2 items are tracked for future work

**Blockers:**
- List any P0 items that are incomplete and block launch:

1. ________________________________
2. ________________________________
3. ________________________________

**Recommendations:**
- List any P1/P2 items that should be prioritized:

1. ________________________________
2. ________________________________
3. ________________________________

**Sign-Off:**
- [ ] I approve this implementation for MVP launch
- [ ] I approve this implementation for staging deployment only
- [ ] I do not approve (see blockers above)

**Signature:** ________________

---

**ASSUMPTION:** This checklist is a living document and should be updated as requirements evolve. Reviewers should use this checklist systematically to ensure nothing is missed before production deployment.

---

## 14. Consistency Checks

This section provides automated checks to verify internal consistency of the README. All checks should return ZERO hits when the document is consistent.

### 14.1 Database Architecture Consistency

**Check for banned phrase (must return zero results):**
The consistency check script verifies that the banned phrase "DB-per-service architecture (no shared databases)" does not appear in the README (except in the consistency checks section itself).

**Verify database stance consistency:**
The script also verifies that the README consistently mentions:
- MVP = schema-per-module in ONE shared Postgres
- Target = DB-per-service for microservices

### 14.2 Placeholder Consistency

**Check for standalone "..." lines (must return zero results):**
The script verifies that no standalone lines containing only "..." exist in the README.

**Check for truncated fragments:**
The script verifies that no truncated fragments like "REA...echo" or "enfo...ach" exist in the README.

**Note:** Object placeholders like `{...}` and array placeholders like `[...]` in JSON examples are acceptable as they represent structure placeholders, not literal string values.

### 14.3 Running Consistency Checks

Run the consistency check script before committing changes to ensure README.md remains internally consistent:

```bash
./scripts/readme_checks.sh
```

The script performs the following checks:
1. Verifies no banned phrases are present
2. Verifies no standalone "..." lines exist
3. Verifies no truncated fragments exist
4. Verifies database stance consistency

**ASSUMPTION:** All consistency checks pass before the README is considered ready for use.

---

