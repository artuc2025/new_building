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
  BuildingResponseDto,
  PaginatedBuildingsResponseDto,
} from './dto';
import { AdminGuard } from '../common/guards/admin.guard';

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
  async findAll(@Query() query: ListBuildingsQueryDto): Promise<PaginatedBuildingsResponseDto> {
    return this.buildingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get building by ID (public)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiQuery({ name: 'currency', enum: ['AMD', 'USD'], required: false, description: 'Currency for price conversion' })
  @ApiResponse({
    status: 200,
    description: 'Building retrieved successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('currency') currency?: string,
  ): Promise<{ data: BuildingResponseDto }> {
    const building = await this.buildingsService.findOne(id, currency || 'AMD');
    return { data: building };
  }
}

@ApiTags('admin-buildings')
@Controller('v1/admin/buildings')
@UseGuards(AdminGuard)
export class AdminBuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiOperation({ summary: 'Get paginated list of buildings (admin)' })
  @ApiResponse({
    status: 200,
    description: 'List of buildings retrieved successfully',
    type: PaginatedBuildingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin token required' })
  async findAll(@Query() query: ListBuildingsQueryDto): Promise<PaginatedBuildingsResponseDto> {
    // Admin can see all statuses
    return this.buildingsService.findAll(query, true);
  }

  @Get(':id')
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiOperation({ summary: 'Get building by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Building retrieved successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin token required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<{ data: BuildingResponseDto }> {
    const building = await this.buildingsService.findOne(id);
    return { data: building };
  }

  @Post()
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new building (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Building created successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin token required' })
  async create(@Body() createDto: CreateBuildingDto): Promise<{ data: BuildingResponseDto }> {
    const building = await this.buildingsService.create(createDto);
    return { data: building };
  }

  @Put(':id')
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiOperation({ summary: 'Update a building (admin only)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Building updated successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin token required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateBuildingDto,
  ): Promise<{ data: BuildingResponseDto }> {
    const building = await this.buildingsService.update(id, updateDto);
    return { data: building };
  }

  @Delete(':id')
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a building (admin only)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Building deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin token required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<{ data: { id: string; status: string; deletedAt: string } }> {
    return this.buildingsService.remove(id);
  }
}

