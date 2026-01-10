import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Raw } from 'typeorm';
import { Building } from '../entities/building.entity';
import { PricingSnapshot } from '../entities/pricing-snapshot.entity';
import { BuildingStatus } from '@new-building-portal/contracts';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  ListBuildingsQueryDto,
  BuildingResponseDto,
  PaginatedBuildingsResponseDto,
} from './dto';

// Safe sort mapping: enum value -> { column, direction }
const SORT_MAP: Record<string, { column: string; direction: 'ASC' | 'DESC' }> = {
  price_asc: { column: 'price_per_m2_min', direction: 'ASC' },
  price_desc: { column: 'price_per_m2_min', direction: 'DESC' },
  date_desc: { column: 'updated_at', direction: 'DESC' },
  date_asc: { column: 'updated_at', direction: 'ASC' },
  area_asc: { column: 'area_min', direction: 'ASC' },
  area_desc: { column: 'area_min', direction: 'DESC' },
  floors_asc: { column: 'floors', direction: 'ASC' },
  floors_desc: { column: 'floors', direction: 'DESC' },
};

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private buildingsRepository: Repository<Building>,
    @InjectRepository(PricingSnapshot)
    private pricingSnapshotRepository: Repository<PricingSnapshot>,
  ) {}

  async findAll(query: ListBuildingsQueryDto, isAdmin: boolean = false): Promise<PaginatedBuildingsResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const skip = (page - 1) * limit;
    const currency = query.currency || 'AMD';
    const sort = query.sort || 'date_desc';
    // Public endpoints must only expose published buildings (enforce even if status is provided)
    const status = isAdmin ? (query.status || 'all') : BuildingStatus.PUBLISHED;

    // Validate sort enum
    if (!SORT_MAP[sort]) {
      throw new BadRequestException(`Invalid sort value: ${sort}. Allowed values: ${Object.keys(SORT_MAP).join(', ')}`);
    }

    const qb = this.buildingsRepository
      .createQueryBuilder('building')
      .where('building.deleted_at IS NULL');

    // Apply status filter (admin can see all, public only sees published)
    if (isAdmin && status === 'all') {
      // Admin can see all statuses, no filter
    } else {
      qb.andWhere('building.status = :status', { status });
    }

    // Apply filters
    this.applyFilters(qb, query);

    // Apply safe sorting
    const sortConfig = SORT_MAP[sort];
    qb.orderBy(`building.${sortConfig.column}`, sortConfig.direction);

    // Get total count
    const total = await qb.getCount();

    // Apply pagination
    qb.skip(skip).take(limit);

    const buildings = await qb.getMany();

    const totalPages = Math.ceil(total / limit);
    const hasPrev = page > 1;
    const hasNext = totalPages > 0 && page < totalPages;

    return {
      data: buildings.map((b) => this.toResponseDto(b, currency)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
      meta: {
        currency,
        exchangeRate: 1.0, // TODO: Implement currency conversion
        sort,
      },
    };
  }

  async findOne(id: string, currency: string = 'AMD', isAdmin: boolean = false): Promise<BuildingResponseDto> {
    const where: any = { id };
    
    // Admin can see all buildings including soft-deleted ones
    // Public endpoints only see published, non-deleted buildings
    if (!isAdmin) {
      where.deleted_at = null;
      where.status = BuildingStatus.PUBLISHED;
    }

    const building = await this.buildingsRepository.findOne({
      where,
    });

    if (!building) {
      throw new NotFoundException({
        code: 'BUILDING_NOT_FOUND',
        message: `Building with ID '${id}' not found`,
        details: { buildingId: id },
      });
    }

    return this.toResponseDto(building, currency);
  }

  async create(createDto: CreateBuildingDto): Promise<BuildingResponseDto> {
    // Transform camelCase to snake_case for database
    const buildingData: any = {
      title: createDto.title,
      description: createDto.description,
      address: createDto.address,
      address_line_1: createDto.addressLine1,
      address_line_2: createDto.addressLine2,
      city: createDto.city || 'Yerevan',
      postal_code: createDto.postalCode,
      floors: createDto.floors,
      total_units: createDto.totalUnits,
      commissioning_date: createDto.commissioningDate,
      construction_status: createDto.constructionStatus,
      price_per_m2_min: createDto.pricePerM2Min,
      price_per_m2_max: createDto.pricePerM2Max,
      area_min: createDto.areaMin,
      area_max: createDto.areaMax,
      currency: createDto.currency || 'AMD',
      developer_id: createDto.developerId,
      region_id: createDto.regionId,
      status: createDto.status || BuildingStatus.DRAFT,
      is_featured: createDto.isFeatured || false,
      developer_website_url: createDto.developerWebsiteUrl,
      developer_facebook_url: createDto.developerFacebookUrl,
      developer_instagram_url: createDto.developerInstagramUrl,
    };

    // Handle location: convert {lat, lng} to PostGIS Point WKT format
    if (createDto.location) {
      // TypeORM geography column expects WKT format: 'POINT(lng lat)'
      const lng = createDto.location.lng;
      const lat = createDto.location.lat;
      buildingData.location = Raw(() => `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`);
    }

    // Use Raw SQL to insert to avoid "unknown GeoJSON type" error with TypeORM/pg
    // Prepare columns and values
    delete buildingData.location; // Handle location manually
    
    const columns = Object.keys(buildingData);
    const values = columns.map(col => buildingData[col]);
    const placeholders = values.map((_, i) => `$${i + 1}`);
    
    let locationVal = 'DEFAULT';
    if (createDto.location) {
      locationVal = `ST_SetSRID(ST_MakePoint(${createDto.location.lng}, ${createDto.location.lat}), 4326)`;
    }

    const sql = `
      INSERT INTO listings.buildings (${columns.join(', ')}, location)
      VALUES (${placeholders.join(', ')}, ${locationVal})
      RETURNING id
    `;

    const result = await this.buildingsRepository.query(sql, values);
    const savedId = result[0].id;
    const currency = createDto.currency || 'AMD';
    return this.findOne(savedId, currency, true);
  }

  async update(id: string, updateDto: UpdateBuildingDto): Promise<BuildingResponseDto> {
    const building = await this.buildingsRepository.findOne({
      where: { id, deleted_at: null },
    });

    if (!building) {
      throw new NotFoundException({
        code: 'BUILDING_NOT_FOUND',
        message: `Building with ID '${id}' not found`,
        details: { buildingId: id },
      });
    }

    // Check if price is changing - create snapshot before update
    // Convert to numbers for comparison (database decimals may be strings)
    const currentPriceMin = building.price_per_m2_min ? Number(building.price_per_m2_min) : null;
    const currentPriceMax = building.price_per_m2_max ? Number(building.price_per_m2_max) : null;
    const newPriceMin = updateDto.pricePerM2Min !== undefined ? Number(updateDto.pricePerM2Min) : currentPriceMin;
    const newPriceMax = updateDto.pricePerM2Max !== undefined ? Number(updateDto.pricePerM2Max) : currentPriceMax;
    
    const priceChanged = 
      (updateDto.pricePerM2Min !== undefined && newPriceMin !== currentPriceMin) ||
      (updateDto.pricePerM2Max !== undefined && newPriceMax !== currentPriceMax);

    if (priceChanged && currentPriceMin !== null && currentPriceMax !== null) {
      // Create pricing snapshot before updating
      const snapshot = this.pricingSnapshotRepository.create({
        building_id: building.id,
        price_per_m2_min: building.price_per_m2_min,
        price_per_m2_max: building.price_per_m2_max,
        currency: building.currency,
      });
      await this.pricingSnapshotRepository.save(snapshot);
    }

    // Transform camelCase to snake_case for database
    const updateData: any = {};
    
    if (updateDto.title !== undefined) updateData.title = updateDto.title;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.address !== undefined) updateData.address = updateDto.address;
    if (updateDto.addressLine1 !== undefined) updateData.address_line_1 = updateDto.addressLine1;
    if (updateDto.addressLine2 !== undefined) updateData.address_line_2 = updateDto.addressLine2;
    if (updateDto.city !== undefined) updateData.city = updateDto.city;
    if (updateDto.postalCode !== undefined) updateData.postal_code = updateDto.postalCode;
    if (updateDto.floors !== undefined) updateData.floors = updateDto.floors;
    if (updateDto.totalUnits !== undefined) updateData.total_units = updateDto.totalUnits;
    if (updateDto.commissioningDate !== undefined) updateData.commissioning_date = updateDto.commissioningDate;
    if (updateDto.constructionStatus !== undefined) updateData.construction_status = updateDto.constructionStatus;
    if (updateDto.pricePerM2Min !== undefined) updateData.price_per_m2_min = updateDto.pricePerM2Min;
    if (updateDto.pricePerM2Max !== undefined) updateData.price_per_m2_max = updateDto.pricePerM2Max;
    if (updateDto.areaMin !== undefined) updateData.area_min = updateDto.areaMin;
    if (updateDto.areaMax !== undefined) updateData.area_max = updateDto.areaMax;
    if (updateDto.currency !== undefined) updateData.currency = updateDto.currency;
    if (updateDto.developerId !== undefined) updateData.developer_id = updateDto.developerId;
    if (updateDto.regionId !== undefined) updateData.region_id = updateDto.regionId;
    if (updateDto.status !== undefined) updateData.status = updateDto.status;
    if (updateDto.isFeatured !== undefined) updateData.is_featured = updateDto.isFeatured;
    if (updateDto.developerWebsiteUrl !== undefined) updateData.developer_website_url = updateDto.developerWebsiteUrl;
    if (updateDto.developerFacebookUrl !== undefined) updateData.developer_facebook_url = updateDto.developerFacebookUrl;
    if (updateDto.developerInstagramUrl !== undefined) updateData.developer_instagram_url = updateDto.developerInstagramUrl;

    // Handle location update: convert {lat, lng} to PostGIS Point WKT format
    if (updateDto.location) {
      const lng = updateDto.location.lng;
      const lat = updateDto.location.lat;
      updateData.location = Raw(() => `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`);
    }

    // Use Raw SQL to update
    delete updateData.location;
    
    const columns = Object.keys(updateData);
    if (columns.length > 0 || updateDto.location) {
      const values = columns.map(col => updateData[col]);
      const setClauses = columns.map((col, i) => `${col} = $${i + 1}`);
      
      if (updateDto.location) {
        setClauses.push(`location = ST_SetSRID(ST_MakePoint(${updateDto.location.lng}, ${updateDto.location.lat}), 4326)`);
      }
      
      // Add ID as last parameter
      values.push(id);
      
      const sql = `
        UPDATE listings.buildings
        SET ${setClauses.join(', ')}
        WHERE id = $${values.length}
      `;
      
      await this.buildingsRepository.query(sql, values);
    }

    // Admin operations should use admin view (isAdmin=true) to see drafts/archived
    const currency = updateDto.currency || building.currency || 'AMD';
    return this.findOne(id, currency, true);
  }

  async publish(id: string, publish: boolean): Promise<BuildingResponseDto> {
    const building = await this.buildingsRepository.findOne({
      where: { id, deleted_at: null },
    });

    if (!building) {
      throw new NotFoundException({
        code: 'BUILDING_NOT_FOUND',
        message: `Building with ID '${id}' not found`,
        details: { buildingId: id },
      });
    }

    const status = publish ? BuildingStatus.PUBLISHED : BuildingStatus.DRAFT;
    const publishedAt = publish ? new Date() : null;

    await this.buildingsRepository.update(id, {
      status,
      published_at: publishedAt,
    });

    return this.findOne(id, building.currency, true);
  }

  async remove(id: string): Promise<{ data: { id: string; status: string; deletedAt: string } }> {
    const building = await this.buildingsRepository.findOne({
      where: { id, deleted_at: null },
    });

    if (!building) {
      throw new NotFoundException({
        code: 'BUILDING_NOT_FOUND',
        message: `Building with ID '${id}' not found`,
        details: { buildingId: id },
      });
    }

    // Soft delete: set status to archived and deleted_at
    const deletedAt = new Date();
    await this.buildingsRepository.update(id, {
      status: BuildingStatus.ARCHIVED,
      deleted_at: deletedAt,
    });

    return {
      data: {
        id: building.id,
        status: BuildingStatus.ARCHIVED,
        deletedAt: deletedAt.toISOString(),
      },
    };
  }

  private applyFilters(qb: SelectQueryBuilder<Building>, query: ListBuildingsQueryDto): void {
    // Price range filter - overlap (intersection) logic
    // Two ranges overlap if: range1_max >= range2_min AND range1_min <= range2_max
    if (query.price_min !== undefined && query.price_max !== undefined) {
      // Both min and max provided: overlap check
      qb.andWhere('building.price_per_m2_max >= :price_min', { price_min: query.price_min });
      qb.andWhere('building.price_per_m2_min <= :price_max', { price_max: query.price_max });
    } else if (query.price_min !== undefined) {
      // Only min provided: building's max must be >= filter min
      qb.andWhere('building.price_per_m2_max >= :price_min', { price_min: query.price_min });
    } else if (query.price_max !== undefined) {
      // Only max provided: building's min must be <= filter max
      qb.andWhere('building.price_per_m2_min <= :price_max', { price_max: query.price_max });
    }

    // Area range filter - overlap (intersection) logic
    if (query.area_min !== undefined && query.area_max !== undefined) {
      // Both min and max provided: overlap check
      qb.andWhere('building.area_max >= :area_min', { area_min: query.area_min });
      qb.andWhere('building.area_min <= :area_max', { area_max: query.area_max });
    } else if (query.area_min !== undefined) {
      // Only min provided: building's max must be >= filter min
      qb.andWhere('building.area_max >= :area_min', { area_min: query.area_min });
    } else if (query.area_max !== undefined) {
      // Only max provided: building's min must be <= filter max
      qb.andWhere('building.area_min <= :area_max', { area_max: query.area_max });
    }

    // Floors range filter
    if (query.floors_min !== undefined) {
      qb.andWhere('building.floors >= :floors_min', { floors_min: query.floors_min });
    }
    if (query.floors_max !== undefined) {
      qb.andWhere('building.floors <= :floors_max', { floors_max: query.floors_max });
    }

    // Developer filter
    if (query.developer_id) {
      qb.andWhere('building.developer_id = :developer_id', { developer_id: query.developer_id });
    }

    // Region filter
    if (query.region_id) {
      qb.andWhere('building.region_id = :region_id', { region_id: query.region_id });
    }

    // Commissioning date filters
    if (query.commissioning_date_from) {
      qb.andWhere('building.commissioning_date >= :commissioning_date_from', {
        commissioning_date_from: query.commissioning_date_from,
      });
    }
    if (query.commissioning_date_to) {
      qb.andWhere('building.commissioning_date <= :commissioning_date_to', {
        commissioning_date_to: query.commissioning_date_to,
      });
    }
  }

  private toResponseDto(building: Building, currency: string = 'AMD'): BuildingResponseDto {
    // Extract lat/lng from PostGIS Point
    // The location is stored as geography(POINT, 4326)
    // We need to extract coordinates using ST_X and ST_Y
    let location: { lat: number; lng: number } = { lat: 0, lng: 0 };
    
    // If location is a string (WKT format), parse it
    if (typeof building.location === 'string') {
      const match = building.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (match) {
        location = { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
      }
    } else if (building.location && typeof building.location === 'object') {
      // If it's already an object with coordinates
      const coords = (building.location as any).coordinates || (building.location as any);
      if (Array.isArray(coords) && coords.length >= 2) {
        location = { lng: coords[0], lat: coords[1] };
      } else if (coords.lat !== undefined && coords.lng !== undefined) {
        location = { lat: coords.lat, lng: coords.lng };
      }
    }

    // Currency conversion logic (Fixed exchange rate for now: 1 USD = 400 AMD)
    const exchangeRate = currency === 'USD' ? 0.0025 : 1.0; // 1/400 = 0.0025
    const convertPrice = (price?: number | string) => {
      if (price === undefined || price === null) return undefined;
      return Math.round(Number(price) * exchangeRate);
    };

    // Transform to camelCase for API response
    return {
      id: building.id,
      title: building.title,
      description: building.description,
      address: building.address,
      location,
      addressLine1: building.address_line_1 || undefined,
      addressLine2: building.address_line_2 || undefined,
      city: building.city,
      postalCode: building.postal_code || undefined,
      floors: building.floors,
      totalUnits: building.total_units || undefined,
      commissioningDate: building.commissioning_date ? (building.commissioning_date instanceof Date ? building.commissioning_date.toISOString().split('T')[0] : building.commissioning_date) : undefined,
      constructionStatus: building.construction_status || undefined,
      pricePerM2Min: convertPrice(building.price_per_m2_min),
      pricePerM2Max: convertPrice(building.price_per_m2_max),
      areaMin: Number(building.area_min),
      areaMax: Number(building.area_max),
      currency,
      developerId: building.developer_id,
      regionId: building.region_id,
      status: building.status,
      isFeatured: building.is_featured || false,
      developerWebsiteUrl: building.developer_website_url || undefined,
      developerFacebookUrl: building.developer_facebook_url || undefined,
      developerInstagramUrl: building.developer_instagram_url || undefined,
      createdAt: building.created_at ? (building.created_at instanceof Date ? building.created_at.toISOString() : building.created_at) : undefined,
      updatedAt: building.updated_at ? (building.updated_at instanceof Date ? building.updated_at.toISOString() : building.updated_at) : undefined,
      publishedAt: building.published_at ? (building.published_at instanceof Date ? building.published_at.toISOString() : building.published_at) : undefined,
      createdBy: building.created_by || undefined,
    } as BuildingResponseDto;
  }
}
