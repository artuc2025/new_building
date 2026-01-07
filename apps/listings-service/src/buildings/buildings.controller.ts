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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
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
  @ApiOperation({ summary: 'Get paginated list of buildings' })
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
  @ApiOperation({ summary: 'Get building by ID' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Building retrieved successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async findOne(@Param('id') id: string): Promise<BuildingResponseDto> {
    return this.buildingsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new building (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Building created successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin token required' })
  async create(@Body() createDto: CreateBuildingDto): Promise<BuildingResponseDto> {
    return this.buildingsService.create(createDto);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a building (admin only)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Building updated successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin token required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBuildingDto,
  ): Promise<BuildingResponseDto> {
    return this.buildingsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a building (admin only)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Building deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin token required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.buildingsService.remove(id);
  }
}

