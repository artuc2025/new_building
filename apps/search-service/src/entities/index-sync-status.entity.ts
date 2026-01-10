import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Tracks last sync timestamp and sync errors for Meilisearch index.
 */
@Entity('index_sync_status', { schema: 'search' })
@Index(['entityType', 'entityId'], { unique: true })
export class IndexSyncStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  entityType: string; // 'building', 'developer', etc.

  @Column({ type: 'uuid', nullable: false })
  entityId: string;

  @Column({ type: 'timestamptz', nullable: false })
  lastSyncedAt: Date;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'success' })
  status: 'success' | 'error' | 'pending';

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'integer', nullable: false, default: 0 })
  retryCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
