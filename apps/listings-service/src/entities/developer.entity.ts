import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('developers', { schema: 'listings' })
export class Developer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', nullable: false })
  name: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  description?: Record<string, string>;

  @Column({ type: 'uuid', nullable: true })
  logo_media_id?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website_url?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'jsonb', nullable: true })
  address?: Record<string, string>;

  @Column({ type: 'integer', nullable: true })
  established_year?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

