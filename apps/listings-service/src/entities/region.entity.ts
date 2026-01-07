import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('regions', { schema: 'listings' })
export class Region {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', nullable: false })
  name: Record<string, string>;

  @Column({ type: 'uuid', nullable: true })
  parent_region_id?: string;

  @ManyToOne(() => Region, { nullable: true })
  @JoinColumn({ name: 'parent_region_id' })
  parent_region?: Region;

  @Column({ type: 'varchar', length: 50, nullable: false })
  region_type: 'city' | 'district' | 'neighborhood';

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  boundary?: string; // PostGIS POLYGON stored as WKT

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

