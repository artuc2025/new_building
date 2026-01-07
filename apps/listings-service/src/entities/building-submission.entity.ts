import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Building } from './building.entity';

@Entity('building_submissions', { schema: 'listings' })
export class BuildingSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', nullable: true })
  title?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  address?: Record<string, string>;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location?: string; // PostGIS POINT stored as WKT

  @Column({ type: 'varchar', length: 255, nullable: true })
  developer_name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contact_phone?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected' | 'converted';

  @Column({ type: 'uuid', nullable: true })
  converted_to_building_id?: string;

  @ManyToOne(() => Building, { nullable: true })
  @JoinColumn({ name: 'converted_to_building_id' })
  converted_to_building?: Building;

  @CreateDateColumn({ type: 'timestamptz' })
  submitted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at?: Date;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by?: string;
}

