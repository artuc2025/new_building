import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiResponse, ApiHeader, ApiOkResponse, ApiCreatedResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { PaginatedBuildingsResponseDto, BuildingEnvelopeDto, BuildingResponseDto, PaginationMetaDto, ResponseMetaDto, BuildingStatus } from '@new-building-portal/contracts';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('buildings')
@ApiExtraModels(PaginatedBuildingsResponseDto, BuildingEnvelopeDto, BuildingResponseDto, PaginationMetaDto, ResponseMetaDto)
@Controller('api/v1/buildings')
export class ListingsController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getListingsServiceUrl(): string {
    return (
      this.configService.get<string>('LISTINGS_SERVICE_URL') ||
      'http://localhost:3001'
    );
  }

  private getTimeout(): number {
    return this.configService.get<number>('LISTINGS_SERVICE_TIMEOUT', 10000); // 10 seconds default
  }

  private async proxyRequest(
    method: string,
    path: string,
    req: Request,
    body?: any,
  ): Promise<any> {
    const baseUrl = this.getListingsServiceUrl();
    const url = `${baseUrl}${path}`;
    const timeoutMs = this.getTimeout();

    try {
      // Forward headers (excluding host and connection-specific headers)
      const headers: Record<string, string> = {};
      Object.keys(req.headers).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (
          !['host', 'connection', 'content-length'].includes(lowerKey) &&
          req.headers[key]
        ) {
          headers[key] = req.headers[key] as string;
        }
      });

      // Forward x-request-id if present
      if (req.headers['x-request-id']) {
        headers['x-request-id'] = req.headers['x-request-id'] as string;
      }

      // Make request with timeout
      const response = await firstValueFrom(
        this.httpService
          .request({
            method: method as any,
            url,
            headers,
            data: body,
            timeout: timeoutMs,
            validateStatus: () => true, // Don't throw on any status code
          })
          .pipe(
            timeout(timeoutMs),
            catchError((error: AxiosError) => {
              // Normalize axios errors to README error format
              if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                const requestId = req.headers['x-request-id'] as string || 'unknown';
                throw new HttpException(
                  {
                    error: {
                      code: 'GATEWAY_TIMEOUT',
                      message: 'Request to listings service timed out',
                      details: { service: 'listings-service', timeout: timeoutMs },
                      requestId,
                      statusCode: HttpStatus.GATEWAY_TIMEOUT,
                    },
                  },
                  HttpStatus.GATEWAY_TIMEOUT,
                );
              }

              if (error.response) {
                // Forward error response from upstream service (already in README format)
                const status = error.response.status;
                const data = error.response.data as any;
                
                // If upstream already has error envelope, forward it
                if (data?.error) {
                  throw new HttpException(data, status);
                }
                
                // Otherwise, normalize to README format
                const requestId = data?.error?.requestId || req.headers['x-request-id'] as string || 'unknown';
                throw new HttpException(
                  {
                    error: {
                      code: status >= 500 ? 'SERVICE_UNAVAILABLE' : this.getErrorCodeFromStatus(status),
                      message: data?.message || data?.error?.message || error.message || 'Request failed',
                      details: data?.details || data?.error?.details,
                      requestId,
                      statusCode: status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : status,
                    },
                  },
                  status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : status,
                );
              }

              // Network or other errors
              const requestId = req.headers['x-request-id'] as string || 'unknown';
              throw new HttpException(
                {
                  error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Failed to connect to listings service',
                    details: { service: 'listings-service', error: error.message },
                    requestId,
                    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                  },
                },
                HttpStatus.SERVICE_UNAVAILABLE,
              );
            }),
          ),
      );

      // Handle non-2xx status codes
      if (response.status >= 400) {
        const errorData = response.data || {};
        
        // If upstream already has error envelope, forward it
        if (errorData.error) {
          throw new HttpException(errorData, response.status);
        }
        
        // Otherwise, normalize to README format
        const requestId = errorData.error?.requestId || req.headers['x-request-id'] as string || 'unknown';
        throw new HttpException(
          {
            error: {
              code: response.status >= 500 ? 'SERVICE_UNAVAILABLE' : this.getErrorCodeFromStatus(response.status),
              message: errorData.message || errorData.error?.message || 'Request failed',
              details: errorData.details || errorData.error?.details,
              requestId,
              statusCode: response.status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : response.status,
            },
          },
          response.status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : response.status,
        );
      }

      // Return response data (NestJS will handle status code)
      // For 204 No Content, return undefined
      if (response.status === 204) {
        return undefined;
      }
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Unexpected errors
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      throw new HttpException(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal gateway error',
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
            requestId,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  private buildQueryString(query: Record<string, any>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue; // Skip undefined/null values
      }
      if (Array.isArray(value)) {
        // Handle arrays by appending each value
        for (const item of value) {
          params.append(key, String(item));
        }
      } else {
        // Handle numbers/booleans by converting to string
        params.append(key, String(value));
      }
    }
    return params.toString();
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of buildings (public)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sort option', enum: ['price_asc', 'price_desc', 'date_desc', 'date_asc', 'area_asc', 'area_desc'] })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Currency filter', enum: ['AMD', 'USD'] })
  @ApiQuery({ name: 'price_min', required: false, type: Number, description: 'Minimum price per m² (in selected currency)' })
  @ApiQuery({ name: 'price_max', required: false, type: Number, description: 'Maximum price per m² (in selected currency)' })
  @ApiQuery({ name: 'area_min', required: false, type: Number, description: 'Minimum area (m²)' })
  @ApiQuery({ name: 'area_max', required: false, type: Number, description: 'Maximum area (m²)' })
  @ApiQuery({ name: 'floors_min', required: false, type: Number, description: 'Minimum number of floors' })
  @ApiQuery({ name: 'floors_max', required: false, type: Number, description: 'Maximum number of floors' })
  @ApiQuery({ name: 'region_id', required: false, type: String, description: 'Region ID (UUID)' })
  @ApiQuery({ name: 'developer_id', required: false, type: String, description: 'Developer ID (UUID)' })
  @ApiQuery({ name: 'commissioning_date_from', required: false, type: String, description: 'Commissioning date from (ISO 8601 date string)' })
  @ApiQuery({ name: 'commissioning_date_to', required: false, type: String, description: 'Commissioning date to (ISO 8601 date string)' })
  @ApiQuery({ name: 'bbox', required: false, type: String, description: 'Bounding box filter: "minLng,minLat,maxLng,maxLat"' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Status filter (public endpoints only expose published buildings). Defaults to "published".', enum: [BuildingStatus.PUBLISHED] })
  @ApiOkResponse({ type: PaginatedBuildingsResponseDto, description: 'List of buildings retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async findAll(@Req() req: Request): Promise<PaginatedBuildingsResponseDto> {
    // Public endpoints: enforce published-only status
    // If status is provided, validate it's 'published', otherwise default to 'published'
    const query = { ...(req.query as Record<string, any>) };
    if (query.status && query.status !== BuildingStatus.PUBLISHED) {
      // Reject any non-published status for public endpoints
      throw new HttpException(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid status value. Public endpoints only accept status="published"',
            details: { provided: query.status, allowed: [BuildingStatus.PUBLISHED] },
            statusCode: HttpStatus.BAD_REQUEST,
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    // Set status to published if not provided or ensure it's published
    query.status = BuildingStatus.PUBLISHED;
    const queryString = this.buildQueryString(query);
    const path = `/v1/buildings${queryString ? `?${queryString}` : ''}`;
    return this.proxyRequest('GET', path, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get building by ID (public)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)', type: String })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Currency for price conversion' })
  @ApiOkResponse({ type: BuildingEnvelopeDto, description: 'Building retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request): Promise<BuildingEnvelopeDto> {
    // Public endpoints: strip status parameter to enforce published-only
    const query = { ...(req.query as Record<string, any>) };
    delete query.status;
    const queryString = this.buildQueryString(query);
    const path = `/v1/buildings/${id}${queryString ? `?${queryString}` : ''}`;
    return this.proxyRequest('GET', path, req);
  }

  @Post()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new building (admin only)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiBody({ 
    description: 'Building data',
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  })
  @ApiCreatedResponse({ type: BuildingEnvelopeDto, description: 'Building created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async create(@Req() req: Request): Promise<BuildingEnvelopeDto> {
    // proxyRequest already forwards all headers including x-admin-key
    return this.proxyRequest('POST', '/v1/admin/buildings', req, req.body);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update building by ID (admin only)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)', type: String })
  @ApiBody({ 
    description: 'Updated building data',
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  })
  @ApiOkResponse({
    description: 'Building updated successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(BuildingEnvelopeDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request): Promise<BuildingEnvelopeDto> {
    // proxyRequest already forwards all headers including x-admin-key
    return this.proxyRequest('PUT', `/v1/admin/buildings/${id}`, req, req.body);
  }

  @Post(':id/publish')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish or unpublish a building (admin only)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        publish: { type: 'boolean' }
      }
    }
  })
  @ApiOkResponse({ type: BuildingEnvelopeDto, description: 'Building status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async publish(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request): Promise<BuildingEnvelopeDto> {
    return this.proxyRequest('POST', `/v1/admin/buildings/${id}/publish`, req, req.body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete building by ID (admin only)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)', type: String })
  @ApiOkResponse({ 
    description: 'Building deleted successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: [BuildingStatus.ARCHIVED] },
            deletedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request): Promise<any> {
    // proxyRequest already forwards all headers including x-admin-key
    return this.proxyRequest('DELETE', `/v1/admin/buildings/${id}`, req);
  }
}

