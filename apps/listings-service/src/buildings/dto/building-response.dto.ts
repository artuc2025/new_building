import { ApiProperty } from '@nestjs/swagger';

export class BuildingResponseDto {
  @ApiProperty({ description: 'Building ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'Building title in multiple languages' })
  title: Record<string, string>;

  @ApiProperty({ description: 'Building description in multiple languages', required: false })
  description?: Record<string, string>;

  @ApiProperty({ description: 'Building address in multiple languages' })
  address: Record<string, string>;

  @ApiProperty({ description: 'Geographic location (WKT POINT format)' })
  location: string;

  @ApiProperty({ description: 'Address line 1', required: false })
  address_line_1?: string;

  @ApiProperty({ description: 'Address line 2', required: false })
  address_line_2?: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'Postal code', required: false })
  postal_code?: string;

  @ApiProperty({ description: 'Number of floors' })
  floors: number;

  @ApiProperty({ description: 'Total units', required: false })
  total_units?: number;

  @ApiProperty({ description: 'Commissioning date', required: false })
  commissioning_date?: Date;

  @ApiProperty({
    description: 'Construction status',
    enum: ['planned', 'under_construction', 'completed'],
    required: false,
  })
  construction_status?: 'planned' | 'under_construction' | 'completed';

  @ApiProperty({ description: 'Minimum price per m²', required: false })
  price_per_m2_min?: number;

  @ApiProperty({ description: 'Maximum price per m²', required: false })
  price_per_m2_max?: number;

  @ApiProperty({ description: 'Minimum area (m²)' })
  area_min: number;

  @ApiProperty({ description: 'Maximum area (m²)' })
  area_max: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Developer ID (UUID)' })
  developer_id: string;

  @ApiProperty({ description: 'Region ID (UUID)' })
  region_id: string;

  @ApiProperty({
    description: 'Status',
    enum: ['draft', 'published', 'archived'],
  })
  status: 'draft' | 'published' | 'archived';

  @ApiProperty({ description: 'Is featured', required: false })
  is_featured?: boolean;

  @ApiProperty({ description: 'Developer website URL', required: false })
  developer_website_url?: string;

  @ApiProperty({ description: 'Developer Facebook URL', required: false })
  developer_facebook_url?: string;

  @ApiProperty({ description: 'Developer Instagram URL', required: false })
  developer_instagram_url?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updated_at: Date;

  @ApiProperty({ description: 'Published at timestamp', required: false })
  published_at?: Date;

  @ApiProperty({ description: 'Created by user ID (UUID)', required: false })
  created_by?: string;
}

