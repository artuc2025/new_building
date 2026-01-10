import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './services/search.service';
import {
  SearchBuildingsDto,
  SearchBuildingsResponseDto,
  SearchBuildingsMapDto,
  SearchBuildingsMapResponseDto,
} from './dto';

@ApiTags('search')
@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('buildings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search buildings (full-text + faceted)' })
  @ApiResponse({ status: 200, description: 'Search results', type: SearchBuildingsResponseDto })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'pricePerM2Min', required: false, type: Number })
  @ApiQuery({ name: 'pricePerM2Max', required: false, type: Number })
  @ApiQuery({ name: 'areaMin', required: false, type: Number })
  @ApiQuery({ name: 'areaMax', required: false, type: Number })
  @ApiQuery({ name: 'regionId', required: false, type: String })
  @ApiQuery({ name: 'developerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['pricePerM2Min', 'updatedAt', 'commissioningDate'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], default: 'desc' })
  async searchBuildings(@Query() dto: SearchBuildingsDto): Promise<SearchBuildingsResponseDto> {
    return this.searchService.searchBuildings(dto);
  }

  @Get('buildings/map')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search buildings within map bounds (geospatial)' })
  @ApiResponse({ status: 200, description: 'Map building points', type: SearchBuildingsMapResponseDto })
  @ApiQuery({ name: 'bounds', required: true, type: String, description: 'Bounding box: "lat1,lng1,lat2,lng2"' })
  async searchBuildingsMap(@Query() dto: SearchBuildingsMapDto): Promise<SearchBuildingsMapResponseDto> {
    return this.searchService.searchBuildingsMap(dto);
  }
}
