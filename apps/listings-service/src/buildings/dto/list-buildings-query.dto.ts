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
} from 'class-validator';

export class ListBuildingsQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Minimum price per m²' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ description: 'Maximum price per m²' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ description: 'Minimum area (m²)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_area?: number;

  @ApiPropertyOptional({ description: 'Maximum area (m²)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_area?: number;

  @ApiPropertyOptional({ description: 'Developer ID (UUID)' })
  @IsOptional()
  @IsUUID()
  developerId?: string;

  @ApiPropertyOptional({ description: 'Region ID (UUID)' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Commissioning date from (ISO date string)' })
  @IsOptional()
  @IsDateString()
  commissioning_date_from?: string;

  @ApiPropertyOptional({ description: 'Commissioning date to (ISO date string)' })
  @IsOptional()
  @IsDateString()
  commissioning_date_to?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['updated_at', 'price_per_m2_min', 'area_min', 'commissioning_date'],
    default: 'updated_at',
  })
  @IsOptional()
  @IsEnum(['updated_at', 'price_per_m2_min', 'area_min', 'commissioning_date'])
  sort_by?: string = 'updated_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';

  // Location filters (bbox or radius - simplified for Sprint 2)
  @ApiPropertyOptional({ description: 'Bounding box: min longitude,min latitude,max longitude,max latitude' })
  @IsOptional()
  @IsString()
  bbox?: string; // Format: "minLon,minLat,maxLon,maxLat"
}

