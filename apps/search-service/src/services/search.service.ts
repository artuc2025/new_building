import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeilisearchService } from './meilisearch.service';
import { BuildingLocation, SearchAnalytics } from '../entities';
import {
  SearchBuildingsDto,
  SearchBuildingsResponseDto,
  SearchBuildingsMapDto,
  SearchBuildingsMapResponseDto,
  BuildingSearchResult,
  MapBuildingPoint,
} from '../dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly meilisearchService: MeilisearchService,
    @InjectRepository(BuildingLocation)
    private readonly buildingLocationRepository: Repository<BuildingLocation>,
    @InjectRepository(SearchAnalytics)
    private readonly searchAnalyticsRepository: Repository<SearchAnalytics>,
  ) {}

  /**
   * Search buildings using Meilisearch.
   */
  async searchBuildings(dto: SearchBuildingsDto): Promise<SearchBuildingsResponseDto> {
    const startTime = Date.now();

    try {
      // Build filters
      const filters: string[] = [];
      if (dto.pricePerM2Min !== undefined) {
        filters.push(`pricePerM2Min >= ${dto.pricePerM2Min}`);
      }
      if (dto.pricePerM2Max !== undefined) {
        filters.push(`pricePerM2Max <= ${dto.pricePerM2Max}`);
      }
      if (dto.areaMin !== undefined) {
        filters.push(`areaMin >= ${dto.areaMin}`);
      }
      if (dto.areaMax !== undefined) {
        filters.push(`areaMax <= ${dto.areaMax}`);
      }
      if (dto.regionId) {
        filters.push(`regionId = "${dto.regionId}"`);
      }
      if (dto.developerId) {
        filters.push(`developerId = "${dto.developerId}"`);
      }
      if (dto.status) {
        filters.push(`status = "${dto.status}"`);
      }

      // Build sort
      const sort: string[] = [];
      if (dto.sortBy) {
        sort.push(`${dto.sortBy}:${dto.sortOrder || 'desc'}`);
      }

      // Calculate pagination
      const page = dto.page || 1;
      const limit = dto.limit || 20;
      const offset = (page - 1) * limit;

      // Execute search
      let result;
      try {
        result = await this.meilisearchService.search(dto.q || '', {
          filters: filters.length > 0 ? filters.join(' AND ') : undefined,
          sort: sort.length > 0 ? sort : undefined,
          limit,
          offset,
        });
      } catch (error: any) {
        this.logger.error('Meilisearch search failed:', error);
        // Return empty results instead of crashing
        return {
          results: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      const executionTime = Date.now() - startTime;
      const isZeroResult = result.total === 0;

      // Log analytics (async, don't wait)
      this.logSearchAnalytics({
        query: dto.q,
        filters: dto as any,
        resultCount: result.total,
        isZeroResult,
        executionTimeMs: executionTime,
        searchType: 'text',
      }).catch((err) => this.logger.error('Failed to log search analytics:', err));

      // Transform results
      const results: BuildingSearchResult[] = result.hits.map((hit: any) => ({
        buildingId: hit.buildingId,
        title: hit.title,
        address: hit.address,
        description: hit.description,
        pricePerM2Min: hit.pricePerM2Min,
        pricePerM2Max: hit.pricePerM2Max,
        areaMin: hit.areaMin,
        areaMax: hit.areaMax,
        floors: hit.floors,
        commissioningDate: hit.commissioningDate,
        developerId: hit.developerId,
        developerName: hit.developerName,
        regionId: hit.regionId,
        regionName: hit.regionName,
        location: hit.location,
        status: hit.status,
        updatedAt: hit.updatedAt,
        _formatted: hit._formatted,
      }));

      const totalPages = Math.ceil(result.total / limit);

      return {
        results,
        total: result.total,
        page,
        limit,
        totalPages,
        facets: result.facets,
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Search buildings within map bounds using PostGIS.
   * CRITICAL: This queries the search.building_locations read-model, NOT the listings schema.
   */
  async searchBuildingsMap(dto: SearchBuildingsMapDto): Promise<SearchBuildingsMapResponseDto> {
    const startTime = Date.now();

    try {
      // Parse bounds: "southWestLat,southWestLng,northEastLat,northEastLng"
      const [southWestLat, southWestLng, northEastLat, northEastLng] = dto.bounds
        .split(',')
        .map((v) => parseFloat(v.trim()));

      if (
        isNaN(southWestLat) ||
        isNaN(southWestLng) ||
        isNaN(northEastLat) ||
        isNaN(northEastLng)
      ) {
        throw new Error('Invalid bounds format. Expected: "lat1,lng1,lat2,lng2"');
      }

      // Query PostGIS: find points within bounding box
      // Note: PostGIS GEOGRAPHY uses (lng, lat) order
      // Cast geography to geometry for ST_Within comparison (same pattern as listings service)
      let locations;
      try {
        locations = await this.buildingLocationRepository
          .createQueryBuilder('bl')
          .where(
            `ST_Within(
              bl.location::geometry,
              ST_SetSRID(
                ST_MakeEnvelope(:southWestLng, :southWestLat, :northEastLng, :northEastLat),
                4326
              )
            )`,
            {
              southWestLng,
              southWestLat,
              northEastLng,
              northEastLat,
            },
          )
          .getMany();
      } catch (dbError: any) {
        this.logger.error('PostGIS query failed:', dbError);
        this.logger.error('Query parameters:', { southWestLng, southWestLat, northEastLng, northEastLat });
        // Return empty results instead of crashing
        const executionTime = Date.now() - startTime;
        this.logSearchAnalytics({
          query: undefined,
          filters: { bounds: dto.bounds },
          resultCount: 0,
          isZeroResult: true,
          executionTimeMs: executionTime,
          searchType: 'map',
        }).catch((err) => this.logger.error('Failed to log search analytics:', err));
        return {
          results: [],
          total: 0,
        };
      }

      const executionTime = Date.now() - startTime;

      // Log analytics (async)
      this.logSearchAnalytics({
        query: undefined,
        filters: { bounds: dto.bounds },
        resultCount: locations.length,
        isZeroResult: locations.length === 0,
        executionTimeMs: executionTime,
        searchType: 'map',
      }).catch((err) => this.logger.error('Failed to log search analytics:', err));

      // Transform results
      const results: MapBuildingPoint[] = locations.map((loc) => {
        // Parse PostGIS WKT: "POINT(lng lat)"
        const pointMatch = loc.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        const lng = pointMatch ? parseFloat(pointMatch[1]) : 0;
        const lat = pointMatch ? parseFloat(pointMatch[2]) : 0;

        return {
          buildingId: loc.buildingId,
          location: { lat, lng },
          metadata: loc.metadata,
        };
      });

      return {
        results,
        total: results.length,
      };
    } catch (error) {
      this.logger.error('Map search failed:', error);
      throw error;
    }
  }

  /**
   * Log search analytics (async, fire-and-forget).
   */
  private async logSearchAnalytics(data: {
    query?: string;
    filters?: any;
    resultCount: number;
    isZeroResult: boolean;
    executionTimeMs: number;
    searchType: 'text' | 'map' | 'faceted';
  }): Promise<void> {
    try {
      const analytics = this.searchAnalyticsRepository.create({
        query: data.query,
        filters: data.filters,
        resultCount: data.resultCount,
        isZeroResult: data.isZeroResult,
        executionTimeMs: data.executionTimeMs,
        searchType: data.searchType,
      });
      await this.searchAnalyticsRepository.save(analytics);
    } catch (error) {
      // Don't throw - analytics logging should not break search
      this.logger.warn('Failed to save search analytics:', error);
    }
  }
}
