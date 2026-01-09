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
  IsArray,
} from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';
import { BuildingStatus } from '@new-building-portal/contracts';

class LocationDto {
  @ApiProperty({ description: 'Latitude', example: 40.1811 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude', example: 44.5091 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
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
  @Expose({ name: 'address_line_1' })
  @Transform(({ obj }) => {
    // Accept both camelCase and snake_case for backwards compatibility
    return obj?.addressLine1 ?? obj?.address_line_1;
  })
  addressLine1?: string;

  @ApiProperty({ description: 'Address line 2', required: false })
  @IsOptional()
  @IsString()
  @Expose({ name: 'address_line_2' })
  @Transform(({ obj }) => {
    // Accept both camelCase and snake_case for backwards compatibility
    return obj?.addressLine2 ?? obj?.address_line_2;
  })
  addressLine2?: string;

  @ApiProperty({ description: 'City', example: 'Yerevan', default: 'Yerevan' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsOptional()
  @IsString()
  @Expose({ name: 'postal_code' })
  @Transform(({ obj }) => {
    // Accept both camelCase and snake_case for backwards compatibility
    return obj?.postalCode ?? obj?.postal_code;
  })
  postalCode?: string;

  @ApiProperty({ description: 'Number of floors', example: 10 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  floors: number;

  @ApiProperty({ description: 'Total units', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => value !== undefined ? value : undefined)
  totalUnits?: number;

  @ApiProperty({ description: 'Commissioning date (ISO date string)', required: false })
  @IsOptional()
  @IsDateString()
  commissioningDate?: string;

  @ApiProperty({
    description: 'Construction status',
    enum: ['planned', 'under_construction', 'completed'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['planned', 'under_construction', 'completed'])
  constructionStatus?: 'planned' | 'under_construction' | 'completed';

  @ApiProperty({ description: 'Minimum price per m²', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerM2Min?: number;

  @ApiProperty({ description: 'Maximum price per m²', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerM2Max?: number;

  @ApiProperty({ description: 'Minimum area (m²)', example: 45 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  areaMin: number;

  @ApiProperty({ description: 'Maximum area (m²)', example: 120 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  areaMax: number;

  @ApiProperty({ description: 'Currency code', example: 'AMD', default: 'AMD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Developer ID (UUID)' })
  @IsNotEmpty()
  @IsUUID()
  developerId: string;

  @ApiProperty({ description: 'Region ID (UUID)' })
  @IsNotEmpty()
  @IsUUID()
  regionId: string;

  @ApiProperty({
    description: 'Status',
    enum: BuildingStatus,
    default: BuildingStatus.DRAFT,
    required: false,
  })
  @IsOptional()
  @IsEnum(BuildingStatus)
  status?: BuildingStatus;

  @ApiProperty({ description: 'Is featured', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ description: 'Developer website URL', required: false })
  @IsOptional()
  @IsString()
  developerWebsiteUrl?: string;

  @ApiProperty({ description: 'Developer Facebook URL', required: false })
  @IsOptional()
  @IsString()
  developerFacebookUrl?: string;

  @ApiProperty({ description: 'Developer Instagram URL', required: false })
  @IsOptional()
  @IsString()
  developerInstagramUrl?: string;

  @ApiProperty({ description: 'Image IDs (UUIDs)', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  imageIds?: string[];
}

