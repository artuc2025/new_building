import { ApiProperty } from '@nestjs/swagger';
import { BuildingStatus } from './building-status.enum';

export class BuildingResponseDto {
  @ApiProperty({ description: 'Building ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'Building title in multiple languages' })
  title: Record<string, string>;

  @ApiProperty({ description: 'Building description in multiple languages', required: false, nullable: true })
  description?: Record<string, string> | null;

  @ApiProperty({ description: 'Building address in multiple languages' })
  address: Record<string, string>;

  @ApiProperty({ description: 'Geographic location', example: { lat: 40.1811, lng: 44.5144 } })
  location: { lat: number; lng: number };

  @ApiProperty({ description: 'Address line 1', required: false, nullable: true })
  addressLine1?: string | null;

  @ApiProperty({ description: 'Address line 2', required: false, nullable: true })
  addressLine2?: string | null;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'Postal code', required: false, nullable: true })
  postalCode?: string | null;

  @ApiProperty({ description: 'Number of floors' })
  floors: number;

  @ApiProperty({ description: 'Total units', required: false, nullable: true })
  totalUnits?: number | null;

  @ApiProperty({ description: 'Commissioning date', required: false, nullable: true })
  commissioningDate?: Date | string | null;

  @ApiProperty({
    description: 'Construction status',
    enum: ['planned', 'under_construction', 'completed'],
    required: false,
    nullable: true,
  })
  constructionStatus?: 'planned' | 'under_construction' | 'completed' | null;

  @ApiProperty({ description: 'Minimum price per m²', required: false, nullable: true })
  pricePerM2Min?: number | null;

  @ApiProperty({ description: 'Maximum price per m²', required: false, nullable: true })
  pricePerM2Max?: number | null;

  @ApiProperty({ description: 'Minimum area (m²)' })
  areaMin: number;

  @ApiProperty({ description: 'Maximum area (m²)' })
  areaMax: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Developer ID (UUID)' })
  developerId: string;

  @ApiProperty({ description: 'Region ID (UUID)' })
  regionId: string;

  @ApiProperty({
    description: 'Status',
    enum: BuildingStatus,
  })
  status: BuildingStatus;

  @ApiProperty({ description: 'Is featured', required: false, nullable: true })
  isFeatured?: boolean | null;

  @ApiProperty({ description: 'Developer website URL', required: false, nullable: true })
  developerWebsiteUrl?: string | null;

  @ApiProperty({ description: 'Developer Facebook URL', required: false, nullable: true })
  developerFacebookUrl?: string | null;

  @ApiProperty({ description: 'Developer Instagram URL', required: false, nullable: true })
  developerInstagramUrl?: string | null;

  @ApiProperty({ description: 'Created at timestamp', type: String })
  createdAt: Date | string;

  @ApiProperty({ description: 'Updated at timestamp', type: String })
  updatedAt: Date | string;

  @ApiProperty({ description: 'Published at timestamp', required: false, type: String, nullable: true })
  publishedAt?: Date | string | null;

  @ApiProperty({ description: 'Created by user ID (UUID)', required: false, nullable: true })
  createdBy?: string | null;
}

