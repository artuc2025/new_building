import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('assets', { schema: 'media' })
@Unique(['bucket', 'object_key'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  original_filename: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  mime_type: string;

  @Column({ type: 'bigint', nullable: false })
  file_size: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  bucket: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  object_key: string;

  @Column({ type: 'integer', nullable: true })
  width?: number;

  @Column({ type: 'integer', nullable: true })
  height?: number;

  @Column({ type: 'jsonb', nullable: true })
  alt_text?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  caption?: Record<string, string>;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  processing_error?: string;

  @Column({ type: 'jsonb', nullable: true })
  variants?: Record<string, string>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

