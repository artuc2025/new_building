import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Developer } from './developer.entity';
import { Region } from './region.entity';

@Entity('buildings', { schema: 'listings' })
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', nullable: false })
  title: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  description?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: false })
  address: Record<string, string>;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: false })
  location: string; // PostGIS POINT stored as WKT (e.g., 'POINT(44.5091 40.1811)')

  @Column({ type: 'varchar', length: 255, nullable: true })
  address_line_1?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address_line_2?: string;

  @Column({ type: 'varchar', length: 100, nullable: false, default: 'Yerevan' })
  city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code?: string;

  @Column({ type: 'integer', nullable: false })
  floors: number;

  @Column({ type: 'integer', nullable: true })
  total_units?: number;

  @Column({ type: 'date', nullable: true })
  commissioning_date?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  construction_status?: 'planned' | 'under_construction' | 'completed';

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price_per_m2_min?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price_per_m2_max?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: false })
  area_min: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: false })
  area_max: number;

  @Column({ type: 'varchar', length: 3, nullable: false, default: 'AMD' })
  currency: string;

  @Column({ type: 'uuid', nullable: false })
  developer_id: string;

  @ManyToOne(() => Developer)
  @JoinColumn({ name: 'developer_id' })
  developer: Developer;

  @Column({ type: 'uuid', nullable: false })
  region_id: string;

  @ManyToOne(() => Region)
  @JoinColumn({ name: 'region_id' })
  region: Region;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ type: 'boolean', nullable: true, default: false })
  is_featured?: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  developer_website_url?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  developer_facebook_url?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  developer_instagram_url?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  published_at?: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @Column({ type: 'tsvector', nullable: true, select: false })
  search_vector?: string;
}

