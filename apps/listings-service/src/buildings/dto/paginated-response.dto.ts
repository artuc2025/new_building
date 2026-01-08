import { ApiProperty } from '@nestjs/swagger';
import { BuildingResponseDto } from './building-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number (1-based)' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;
}

export class ResponseMetaDto {
  @ApiProperty({ description: 'Currency used for prices', enum: ['AMD', 'USD'], example: 'AMD' })
  currency: string;

  @ApiProperty({ description: 'Exchange rate used for currency conversion', example: 1.0 })
  exchangeRate: number;

  @ApiProperty({ description: 'Sort option used', example: 'date_desc' })
  sort: string;
}

export class PaginatedBuildingsResponseDto {
  @ApiProperty({ description: 'List of buildings', type: [BuildingResponseDto] })
  data: BuildingResponseDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
  pagination: PaginationMetaDto;

  @ApiProperty({ description: 'Response metadata', type: ResponseMetaDto })
  meta: ResponseMetaDto;
}

