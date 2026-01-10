import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Inbox table for idempotent event processing.
 * Ensures duplicate events are safely ignored.
 */
@Entity('inbox', { schema: 'search' })
@Index(['status', 'createdAt'], { where: 'status = \'pending\'' })
@Index(['eventId'], { unique: true })
export class Inbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  eventId: string; // From event metadata - ensures idempotency

  @Column({ type: 'varchar', length: 100, nullable: false })
  eventType: string; // e.g., 'listings.building.created'

  @Column({ type: 'uuid', nullable: false })
  aggregateId: string; // Building ID, etc.

  @Column({ type: 'jsonb', nullable: false })
  payload: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: 'pending',
  })
  status: 'pending' | 'processed' | 'failed';

  @Column({ type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
