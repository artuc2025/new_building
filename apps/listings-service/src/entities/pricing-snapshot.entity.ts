import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Building } from './building.entity';

@Entity('pricing_snapshots', { schema: 'listings' })
@Unique(['building_id', 'snapshot_date'])
export class PricingSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  building_id: string;

  @ManyToOne(() => Building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
  price_per_m2_min: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
  price_per_m2_max: number;

  @Column({ type: 'varchar', length: 3, nullable: false, default: 'AMD' })
  currency: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  area_min?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  area_max?: number;

  @Column({ type: 'date', nullable: false, default: () => 'CURRENT_DATE' })
  snapshot_date: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

