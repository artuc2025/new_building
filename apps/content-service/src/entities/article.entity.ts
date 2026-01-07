import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('articles', { schema: 'content' })
@Unique(['slug'])
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  slug: string;

  @Column({ type: 'jsonb', nullable: false })
  title: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  excerpt?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: false })
  body: Record<string, string>;

  @Column({ type: 'uuid', nullable: true })
  featured_image_media_id?: string;

  @Column({ type: 'uuid', nullable: true })
  author_id?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ type: 'timestamptz', nullable: true })
  published_at?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

