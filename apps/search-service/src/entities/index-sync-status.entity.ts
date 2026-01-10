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

  @Column({ type: 'varchar', length: 50, nullable: false, name: 'entity_type' })
  entityType: string; // 'building', 'developer', etc.

  @Column({ type: 'uuid', nullable: false, name: 'entity_id' })
  entityId: string;

  @Column({ type: 'timestamptz', nullable: false, name: 'last_synced_at' })
  lastSyncedAt: Date;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'success' })
  status: 'success' | 'error' | 'pending';

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @Column({ type: 'integer', nullable: false, default: 0, name: 'retry_count' })
  retryCount: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
