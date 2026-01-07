import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  Min,
  Max,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({ description: 'Longitude', example: 44.5091 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Latitude', example: 40.1811 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;
}

export class CreateBuildingDto {
  @ApiProperty({
    description: 'Building title in multiple languages',
    example: { am: 'Նոր շենք', ru: 'Новое здание', en: 'New Building' },
  })
  @IsNotEmpty()
  @IsObject()
  title: Record<string, string>;

  @ApiProperty({
    description: 'Building description in multiple languages',
    example: { am: 'Նկարագրություն', ru: 'Описание', en: 'Description' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @ApiProperty({
    description: 'Building address in multiple languages',
    example: { am: 'Հասցե', ru: 'Адрес', en: 'Address' },
  })
  @IsNotEmpty()
  @IsObject()
  address: Record<string, string>;

  @ApiProperty({ description: 'Geographic location (longitude, latitude)' })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: 'Address line 1', required: false })
  @IsOptional()
  @IsString()
  address_line_1?: string;

  @ApiProperty({ description: 'Address line 2', required: false })
  @IsOptional()
  @IsString()
  address_line_2?: string;

  @ApiProperty({ description: 'City', example: 'Yerevan', default: 'Yerevan' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiProperty({ description: 'Number of floors', example: 10 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  floors: number;

  @ApiProperty({ description: 'Total units', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  total_units?: number;

  @ApiProperty({ description: 'Commissioning date (ISO date string)', required: false })
  @IsOptional()
  @IsDateString()
  commissioning_date?: string;

  @ApiProperty({
    description: 'Construction status',
    enum: ['planned', 'under_construction', 'completed'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['planned', 'under_construction', 'completed'])
  construction_status?: 'planned' | 'under_construction' | 'completed';

  @ApiProperty({ description: 'Minimum price per m²', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price_per_m2_min?: number;

  @ApiProperty({ description: 'Maximum price per m²', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price_per_m2_max?: number;

  @ApiProperty({ description: 'Minimum area (m²)', example: 50 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  area_min: number;

  @ApiProperty({ description: 'Maximum area (m²)', example: 150 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  area_max: number;

  @ApiProperty({ description: 'Currency code', example: 'AMD', default: 'AMD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Developer ID (UUID)' })
  @IsNotEmpty()
  @IsUUID()
  developer_id: string;

  @ApiProperty({ description: 'Region ID (UUID)' })
  @IsNotEmpty()
  @IsUUID()
  region_id: string;

  @ApiProperty({
    description: 'Status',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    required: false,
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @ApiProperty({ description: 'Is featured', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiProperty({ description: 'Developer website URL', required: false })
  @IsOptional()
  @IsString()
  developer_website_url?: string;

  @ApiProperty({ description: 'Developer Facebook URL', required: false })
  @IsOptional()
  @IsString()
  developer_facebook_url?: string;

  @ApiProperty({ description: 'Developer Instagram URL', required: false })
  @IsOptional()
  @IsString()
  developer_instagram_url?: string;
}

