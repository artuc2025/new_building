import { ApiProperty } from '@nestjs/swagger';
import { BuildingResponseDto } from './building-response.dto';

export class PaginatedBuildingsResponseDto {
  @ApiProperty({ description: 'List of buildings', type: [BuildingResponseDto] })
  data: BuildingResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page number (1-based)' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  total_pages: number;
}

