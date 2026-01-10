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

  @Column({ type: 'integer', nullable: false, default: 0, name: 'result_count' })
  resultCount: number;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'is_zero_result' })
  isZeroResult: boolean; // True if no results found

  @Column({ type: 'integer', nullable: false, name: 'execution_time_ms' })
  executionTimeMs: number; // Query execution time in milliseconds

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'search_type' })
  searchType?: 'text' | 'map' | 'faceted'; // Type of search performed

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
