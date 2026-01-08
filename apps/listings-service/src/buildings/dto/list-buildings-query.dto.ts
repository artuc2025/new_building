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
    description: 'Status filter (public: published only; admin: draft, published, archived, all)',
    enum: ['published', 'draft', 'archived', 'all'],
    default: 'published',
  })
  @IsOptional()
  @IsEnum(['published', 'draft', 'archived', 'all'])
  status?: string = 'published';

  @ApiPropertyOptional({
    description: 'Sort option',
    enum: ['price_asc', 'price_desc', 'date_desc', 'date_asc', 'area_asc', 'area_desc'],
    default: 'date_desc',
  })
  @IsOptional()
  @IsEnum(['price_asc', 'price_desc', 'date_desc', 'date_asc', 'area_asc', 'area_desc'])
  sort?: string = 'date_desc';

  @ApiPropertyOptional({
    description: 'Currency for price filtering and conversion',
    enum: ['AMD', 'USD'],
    default: 'AMD',
  })
  @IsOptional()
  @IsEnum(['AMD', 'USD'])
  currency?: string = 'AMD';

  @ApiPropertyOptional({
    description: 'Bounding box filter: "minLng,minLat,maxLng,maxLat" (e.g., "44.45,40.15,44.60,40.25")',
    example: '44.45,40.15,44.60,40.25',
  })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/, {
    message: 'bbox must be in format "minLng,minLat,maxLng,maxLat" with 4 numbers',
  })
  bbox?: string;
}

