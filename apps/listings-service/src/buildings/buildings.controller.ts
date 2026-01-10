import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import {
  PublicListBuildingsQueryDto,
} from './dto';
import { PaginatedBuildingsResponseDto, BuildingEnvelopeDto } from '@new-building-portal/contracts';

@ApiTags('buildings')
@Controller('v1/buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of buildings (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of buildings retrieved successfully',
    type: PaginatedBuildingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async findAll(@Query() query: PublicListBuildingsQueryDto) {
    // Public endpoints only return published buildings
    return this.buildingsService.findAll(query as any, false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get building by ID (public)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiQuery({ name: 'currency', enum: ['AMD', 'USD'], required: false, description: 'Currency for price conversion' })
  @ApiResponse({
    status: 200,
    description: 'Building retrieved successfully',
    type: BuildingEnvelopeDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('currency') currency?: string,
  ) {
    // Public endpoints only return published buildings
    const building = await this.buildingsService.findOne(id, currency || 'AMD', false);
    return { data: building };
  }
}