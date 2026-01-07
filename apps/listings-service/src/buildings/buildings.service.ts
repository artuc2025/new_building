import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Building } from '../entities/building.entity';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  ListBuildingsQueryDto,
  BuildingResponseDto,
  PaginatedBuildingsResponseDto,
} from './dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private buildingsRepository: Repository<Building>,
  ) {}

  async findAll(query: ListBuildingsQueryDto): Promise<PaginatedBuildingsResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100); // Cap at 100
    const skip = (page - 1) * limit;

    const qb = this.buildingsRepository
      .createQueryBuilder('building')
      .leftJoinAndSelect('building.developer', 'developer')
      .leftJoinAndSelect('building.region', 'region')
      .where('building.deleted_at IS NULL');

    // Apply filters
    this.applyFilters(qb, query);

    // Apply sorting
    const sortBy = query.sort_by || 'updated_at';
    const sortOrder = query.sort_order || 'desc';
    qb.orderBy(`building.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Get total count
    const total = await qb.getCount();

    // Apply pagination
    qb.skip(skip).take(limit);

    const buildings = await qb.getMany();

    return {
      data: buildings.map((b) => this.toResponseDto(b)),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BuildingResponseDto> {
    const building = await this.buildingsRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['developer', 'region'],
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }

    return this.toResponseDto(building);
  }

  async create(createDto: CreateBuildingDto): Promise<BuildingResponseDto> {
    const building = this.buildingsRepository.create({
      ...createDto,
      location: `POINT(${createDto.location.longitude} ${createDto.location.latitude})`,
      status: createDto.status || 'draft',
      currency: createDto.currency || 'AMD',
      city: createDto.city || 'Yerevan',
      is_featured: createDto.is_featured || false,
    });

    const saved = await this.buildingsRepository.save(building);
    return this.findOne(saved.id);
  }

  async update(id: string, updateDto: UpdateBuildingDto): Promise<BuildingResponseDto> {
    const building = await this.buildingsRepository.findOne({
      where: { id, deleted_at: null },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }

    const updateData: any = { ...updateDto };

    // Handle location update
    if (updateDto.location) {
      updateData.location = `POINT(${updateDto.location.longitude} ${updateDto.location.latitude})`;
    }

    await this.buildingsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const building = await this.buildingsRepository.findOne({
      where: { id, deleted_at: null },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }

    // Soft delete
    await this.buildingsRepository.update(id, {
      deleted_at: new Date(),
    });
  }

  private applyFilters(qb: SelectQueryBuilder<Building>, query: ListBuildingsQueryDto): void {
    // Price range filter
    if (query.min_price !== undefined) {
      qb.andWhere('building.price_per_m2_min >= :min_price', { min_price: query.min_price });
    }
    if (query.max_price !== undefined) {
      qb.andWhere('building.price_per_m2_max <= :max_price', { max_price: query.max_price });
    }

    // Area range filter
    if (query.min_area !== undefined) {
      qb.andWhere('building.area_min >= :min_area', { min_area: query.min_area });
    }
    if (query.max_area !== undefined) {
      qb.andWhere('building.area_max <= :max_area', { max_area: query.max_area });
    }

    // Developer filter
    if (query.developerId) {
      qb.andWhere('building.developer_id = :developerId', { developerId: query.developerId });
    }

    // Region filter
    if (query.regionId) {
      qb.andWhere('building.region_id = :regionId', { regionId: query.regionId });
    }

    // Commissioning date filters
    if (query.commissioning_date_from) {
      qb.andWhere('building.commissioning_date >= :dateFrom', {
        dateFrom: query.commissioning_date_from,
      });
    }
    if (query.commissioning_date_to) {
      qb.andWhere('building.commissioning_date <= :dateTo', {
        dateTo: query.commissioning_date_to,
      });
    }

    // Bounding box filter (simplified for Sprint 2)
    if (query.bbox) {
      const [minLon, minLat, maxLon, maxLat] = query.bbox.split(',').map(Number);
      if (
        !isNaN(minLon) &&
        !isNaN(minLat) &&
        !isNaN(maxLon) &&
        !isNaN(maxLat) &&
        minLon < maxLon &&
        minLat < maxLat
      ) {
        qb.andWhere(
          `ST_Within(building.location, ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326))`,
          { minLon, minLat, maxLon, maxLat },
        );
      }
    }
  }

  private toResponseDto(building: Building): BuildingResponseDto {
    return {
      id: building.id,
      title: building.title,
      description: building.description,
      address: building.address,
      location: building.location,
      address_line_1: building.address_line_1,
      address_line_2: building.address_line_2,
      city: building.city,
      postal_code: building.postal_code,
      floors: building.floors,
      total_units: building.total_units,
      commissioning_date: building.commissioning_date,
      construction_status: building.construction_status,
      price_per_m2_min: building.price_per_m2_min ? Number(building.price_per_m2_min) : undefined,
      price_per_m2_max: building.price_per_m2_max ? Number(building.price_per_m2_max) : undefined,
      area_min: Number(building.area_min),
      area_max: Number(building.area_max),
      currency: building.currency,
      developer_id: building.developer_id,
      region_id: building.region_id,
      status: building.status,
      is_featured: building.is_featured,
      developer_website_url: building.developer_website_url,
      developer_facebook_url: building.developer_facebook_url,
      developer_instagram_url: building.developer_instagram_url,
      created_at: building.created_at,
      updated_at: building.updated_at,
      published_at: building.published_at,
      created_by: building.created_by,
    };
  }
}

