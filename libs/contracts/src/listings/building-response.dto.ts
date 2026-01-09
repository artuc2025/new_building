import { ApiProperty } from '@nestjs/swagger';
import { BuildingStatus } from './building-status.enum';

export class BuildingResponseDto {
  @ApiProperty({ description: 'Building ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'Building title in multiple languages' })
  title: Record<string, string>;

  @ApiProperty({ description: 'Building description in multiple languages', required: false })
  description?: Record<string, string>;

  @ApiProperty({ description: 'Building address in multiple languages' })
  address: Record<string, string>;

  @ApiProperty({ description: 'Geographic location', example: { lat: 40.1811, lng: 44.5144 } })
  location: { lat: number; lng: number };

  @ApiProperty({ description: 'Address line 1', required: false })
  addressLine1?: string;

  @ApiProperty({ description: 'Address line 2', required: false })
  addressLine2?: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'Postal code', required: false })
  postalCode?: string;

  @ApiProperty({ description: 'Number of floors' })
  floors: number;

  @ApiProperty({ description: 'Total units', required: false })
  totalUnits?: number;

  @ApiProperty({ description: 'Commissioning date', required: false })
  commissioningDate?: Date | string;

  @ApiProperty({
    description: 'Construction status',
    enum: ['planned', 'under_construction', 'completed'],
    required: false,
  })
  constructionStatus?: 'planned' | 'under_construction' | 'completed';

  @ApiProperty({ description: 'Minimum price per m²', required: false })
  pricePerM2Min?: number;

  @ApiProperty({ description: 'Maximum price per m²', required: false })
  pricePerM2Max?: number;

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

  @ApiProperty({ description: 'Is featured', required: false })
  isFeatured?: boolean;

  @ApiProperty({ description: 'Developer website URL', required: false })
  developerWebsiteUrl?: string;

  @ApiProperty({ description: 'Developer Facebook URL', required: false })
  developerFacebookUrl?: string;

  @ApiProperty({ description: 'Developer Instagram URL', required: false })
  developerInstagramUrl?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date | string;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date | string;

  @ApiProperty({ description: 'Published at timestamp', required: false })
  publishedAt?: Date | string;

  @ApiProperty({ description: 'Created by user ID (UUID)', required: false })
  createdBy?: string;
}

