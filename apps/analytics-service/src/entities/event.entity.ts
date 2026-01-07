import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, Index } from 'typeorm';

@Entity('events', { schema: 'analytics' })
@Index(['event_type', 'entity_type', 'entity_id'])
@Index(['created_at'])
@Index(['session_id'], { where: 'session_id IS NOT NULL' })
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  event_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entity_type?: string; // 'building', 'article', 'developer'

  @Column({ type: 'uuid', nullable: true })
  entity_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  session_id?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'inet', nullable: true })
  ip_address?: string;

  @Column({ type: 'text', nullable: true })
  user_agent?: string;

  @PrimaryColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;
}

