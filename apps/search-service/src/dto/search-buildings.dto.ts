import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum BuildingStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class SearchBuildingsDto {
  @ApiPropertyOptional({ description: 'Search query text' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Minimum price per m² (AMD)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerM2Min?: number;

  @ApiPropertyOptional({ description: 'Maximum price per m² (AMD)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerM2Max?: number;

  @ApiPropertyOptional({ description: 'Minimum area (m²)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaMin?: number;

  @ApiPropertyOptional({ description: 'Maximum area (m²)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaMax?: number;

  @ApiPropertyOptional({ description: 'Region ID' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Developer ID' })
  @IsOptional()
  @IsUUID()
  developerId?: string;

  @ApiPropertyOptional({ description: 'Building status', enum: BuildingStatus })
  @IsOptional()
  @IsEnum(BuildingStatus)
  status?: BuildingStatus;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['pricePerM2Min', 'updatedAt', 'commissioningDate'] })
  @IsOptional()
  @IsString()
  sortBy?: 'pricePerM2Min' | 'updatedAt' | 'commissioningDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SearchBuildingsMapDto {
  @ApiProperty({ description: 'Bounding box as "southWestLat,southWestLng,northEastLat,northEastLng"' })
  @IsString()
  bounds: string; // Format: "lat1,lng1,lat2,lng2"
}

export class BuildingSearchResult {
  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  title: Record<string, string>;

  @ApiProperty()
  address: Record<string, string>;

  @ApiProperty()
  description?: Record<string, string>;

  @ApiProperty()
  pricePerM2Min?: number;

  @ApiProperty()
  pricePerM2Max?: number;

  @ApiProperty()
  areaMin: number;

  @ApiProperty()
  areaMax: number;

  @ApiProperty()
  floors: number;

  @ApiProperty()
  commissioningDate?: string;

  @ApiProperty()
  developerId: string;

  @ApiProperty()
  developerName: Record<string, string>;

  @ApiProperty()
  regionId: string;

  @ApiProperty()
  regionName: Record<string, string>;

  @ApiProperty()
  location: { lat: number; lng: number };

  @ApiProperty()
  status: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional()
  _formatted?: Record<string, any>; // Meilisearch highlights
}

export class SearchBuildingsResponseDto {
  @ApiProperty({ type: [BuildingSearchResult] })
  results: BuildingSearchResult[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiPropertyOptional()
  facets?: Record<string, any>;
}

export class MapBuildingPoint {
  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  location: { lat: number; lng: number };

  @ApiProperty()
  metadata: {
    price?: number;
    title?: Record<string, string>;
    thumbnail?: string;
  };
}

export class SearchBuildingsMapResponseDto {
  @ApiProperty({ type: [MapBuildingPoint] })
  results: MapBuildingPoint[];

  @ApiProperty()
  total: number;
}
