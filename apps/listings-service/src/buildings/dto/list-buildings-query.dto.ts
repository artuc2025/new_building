import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsNumber,
  IsUUID,
  IsDateString,
  Min,
  Max,
  IsString,
  IsEnum,
  Matches,
} from 'class-validator';
import { BuildingStatus } from '@new-building-portal/contracts';

export class ListBuildingsQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Minimum price per m² (in selected currency)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_min?: number;

  @ApiPropertyOptional({ description: 'Maximum price per m² (in selected currency)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_max?: number;

  @ApiPropertyOptional({ description: 'Minimum area (m²)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area_min?: number;

  @ApiPropertyOptional({ description: 'Maximum area (m²)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area_max?: number;

  @ApiPropertyOptional({ description: 'Minimum number of floors' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  floors_min?: number;

  @ApiPropertyOptional({ description: 'Maximum number of floors' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  floors_max?: number;

  @ApiPropertyOptional({ description: 'Developer ID (UUID)' })
  @IsOptional()
  @IsUUID()
  developer_id?: string;

  @ApiPropertyOptional({ description: 'Region ID (UUID)' })
  @IsOptional()
  @IsUUID()
  region_id?: string;

  @ApiPropertyOptional({ description: 'Commissioning date from (ISO 8601 date string)' })
  @IsOptional()
  @IsDateString()
  commissioning_date_from?: string;

  @ApiPropertyOptional({ description: 'Commissioning date to (ISO 8601 date string)' })
  @IsOptional()
  @IsDateString()
  commissioning_date_to?: string;

  @ApiPropertyOptional({
    description: 'Status filter (public: published only; admin: draft, published, archived, all). Defaults to "all" for admin, "published" for public.',
    enum: [BuildingStatus.PUBLISHED, BuildingStatus.DRAFT, BuildingStatus.ARCHIVED, 'all'],
  })
  @IsOptional()
  @IsEnum([BuildingStatus.PUBLISHED, BuildingStatus.DRAFT, BuildingStatus.ARCHIVED, 'all'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Sort option',
    enum: ['price_asc', 'price_desc', 'date_desc', 'date_asc', 'area_asc', 'area_desc', 'floors_asc', 'floors_desc'],
    default: 'date_desc',
  })
  @IsOptional()
  @IsEnum(['price_asc', 'price_desc', 'date_desc', 'date_asc', 'area_asc', 'area_desc', 'floors_asc', 'floors_desc'])
  sort?: string = 'date_desc';

  @ApiPropertyOptional({
    description: 'Currency for price filtering and conversion',
    enum: ['AMD', 'USD'],
    default: 'AMD',
  })
  @IsOptional()
  @IsEnum(['AMD', 'USD'])
  currency?: string = 'AMD';
}

