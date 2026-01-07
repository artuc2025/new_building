import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';

@Entity('aggregates', { schema: 'analytics' })
@Unique(['metric_name', 'entity_type', 'entity_id', 'period_type', 'period_start'])
@Index(['entity_type', 'entity_id', 'period_type', 'period_start'])
@Index(['metric_name', 'period_type', 'period_start'])
export class Aggregate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  metric_name: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  entity_type: string;

  @Column({ type: 'uuid', nullable: false })
  entity_id: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  period_type: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @Column({ type: 'timestamptz', nullable: false })
  period_start: Date;

  @Column({ type: 'bigint', nullable: false, default: 0 })
  value: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

