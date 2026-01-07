import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('seo_metadata', { schema: 'content' })
@Unique(['entity_type', 'entity_id'])
export class SeoMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  entity_type: string; // 'article', 'building', 'page'

  @Column({ type: 'uuid', nullable: false })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  meta_title?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  meta_description?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  og_title?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  og_description?: Record<string, string>;

  @Column({ type: 'uuid', nullable: true })
  og_image_media_id?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  canonical_url?: string;

  @Column({ type: 'jsonb', nullable: true })
  structured_data?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

