import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Read-model for geospatial map queries.
 * Populated via NATS events from Listings Service.
 * DO NOT query listings schema directly - this is the source of truth for map queries.
 */
@Entity('building_locations', { schema: 'search' })
export class BuildingLocation {
  @PrimaryColumn({ type: 'uuid', name: 'building_id' })
  buildingId: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: false })
  location: string; // PostGIS GEOGRAPHY(POINT, 4326) stored as WKT (e.g., 'POINT(44.5091 40.1811)')

  @Column({ type: 'jsonb', nullable: false })
  metadata: {
    price?: number; // Price per m² min (for map markers)
    title?: Record<string, string>; // Multi-language title
    thumbnail?: string; // Thumbnail URL for map marker
  };

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
