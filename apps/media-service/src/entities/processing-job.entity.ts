import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from './asset.entity';

@Entity('processing_jobs', { schema: 'media' })
export class ProcessingJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  media_id: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  asset: Asset;

  @Column({ type: 'varchar', length: 50, nullable: false })
  job_type: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'queued' })
  status: 'queued' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'integer', nullable: true, default: 0 })
  retry_count?: number;

  @Column({ type: 'integer', nullable: true, default: 3 })
  max_retries?: number;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @Column({ type: 'timestamptz', nullable: true })
  started_at?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

