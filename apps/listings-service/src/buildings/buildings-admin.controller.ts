import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  ListBuildingsQueryDto,
} from './dto';
import { PaginatedBuildingsResponseDto, BuildingEnvelopeDto } from '@new-building-portal/contracts';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('admin-buildings')
@Controller('v1/admin/buildings')
@UseGuards(AdminGuard)
@ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
export class BuildingsAdminController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all buildings including drafts (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of buildings retrieved successfully',
    type: PaginatedBuildingsResponseDto,
  })
  async findAll(@Query() query: ListBuildingsQueryDto) {
    return this.buildingsService.findAll(query, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get building by ID (admin only, includes soft-deleted)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiQuery({ name: 'currency', enum: ['AMD', 'USD'], required: false, description: 'Currency for price conversion' })
  @ApiResponse({
    status: 200,
    description: 'Building retrieved successfully (includes soft-deleted buildings)',
    type: BuildingEnvelopeDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('currency') currency?: string,
  ) {
    // Admin endpoints can see all buildings including soft-deleted ones
    const building = await this.buildingsService.findOne(id, currency || 'AMD', true);
    return { data: building };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new building (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Building created successfully',
    type: BuildingEnvelopeDto,
  })
  async create(@Body() createDto: CreateBuildingDto) {
    const building = await this.buildingsService.create(createDto);
    return { data: building };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a building (admin only)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Building updated successfully',
    type: BuildingEnvelopeDto,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateBuildingDto,
  ) {
    const building = await this.buildingsService.update(id, updateDto);
    return { data: building };
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish or unpublish a building (admin only)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Building status updated successfully',
    type: BuildingEnvelopeDto,
  })
  async publish(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('publish') publish: boolean,
  ) {
    const building = await this.buildingsService.publish(id, publish);
    return { data: building };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a building (admin only)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Building deleted successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            deletedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.buildingsService.remove(id);
  }
}
