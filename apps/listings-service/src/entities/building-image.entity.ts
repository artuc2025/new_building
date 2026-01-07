import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Building } from './building.entity';

@Entity('building_images', { schema: 'listings' })
export class BuildingImage {
  @PrimaryColumn({ type: 'uuid' })
  building_id: string;

  @ManyToOne(() => Building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @PrimaryColumn({ type: 'uuid' })
  media_id: string; // Reference to media.assets (cross-schema, no FK)

  @Column({ type: 'integer', nullable: false, default: 0 })
  display_order: number;

  @Column({ type: 'boolean', nullable: true, default: false })
  is_primary?: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

