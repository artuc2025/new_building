import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Tracks search queries, result counts, and zero-result queries for analytics.
 */
@Entity('search_analytics', { schema: 'search' })
@Index(['createdAt', 'query'])
@Index(['query', 'resultCount'])
export class SearchAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  query?: string; // Search query text (null for map queries)

  @Column({ type: 'jsonb', nullable: true })
  filters?: Record<string, any>; // Applied filters

  @Column({ type: 'integer', nullable: false, default: 0 })
  resultCount: number;

  @Column({ type: 'boolean', nullable: false, default: false })
  isZeroResult: boolean; // True if no results found

  @Column({ type: 'integer', nullable: false })
  executionTimeMs: number; // Query execution time in milliseconds

  @Column({ type: 'varchar', length: 50, nullable: true })
  searchType?: 'text' | 'map' | 'faceted'; // Type of search performed

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
