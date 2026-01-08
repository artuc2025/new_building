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
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('buildings')
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

  @Get()
  @ApiOperation({ summary: 'Get paginated list of buildings (public)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Currency filter' })
  @ApiResponse({ status: 200, description: 'List of buildings retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async findAll(@Req() req: Request): Promise<any> {
    const query = req.query;
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const path = `/v1/buildings${queryString ? `?${queryString}` : ''}`;
    return this.proxyRequest('GET', path, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get building by ID (public)' })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)', type: String })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Currency for price conversion' })
  @ApiResponse({ status: 200, description: 'Building retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request): Promise<any> {
    const query = req.query;
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const path = `/v1/buildings/${id}${queryString ? `?${queryString}` : ''}`;
    return this.proxyRequest('GET', path, req);
  }
}

@ApiTags('admin-buildings')
@Controller('api/v1/admin/buildings')
@UseGuards(AdminGuard)
export class AdminListingsController {
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
    return this.configService.get<number>('LISTINGS_SERVICE_TIMEOUT', 10000);
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

      if (req.headers['x-request-id']) {
        headers['x-request-id'] = req.headers['x-request-id'] as string;
      }

      // Forward admin key to upstream service
      if (req.headers['x-admin-key']) {
        headers['x-admin-key'] = req.headers['x-admin-key'] as string;
      }

      const response = await firstValueFrom(
        this.httpService
          .request({
            method: method as any,
            url,
            headers,
            data: body,
            timeout: timeoutMs,
            validateStatus: () => true,
          })
          .pipe(
            timeout(timeoutMs),
            catchError((error: AxiosError) => {
              const requestId = req.headers['x-request-id'] as string || 'unknown';
              if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
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
                const status = error.response.status;
                const data = error.response.data as any;
                if (data?.error) {
                  throw new HttpException(data, status);
                }
                throw new HttpException(
                  {
                    error: {
                      code: status >= 500 ? 'SERVICE_UNAVAILABLE' : 'BAD_REQUEST',
                      message: data?.message || error.message || 'Request failed',
                      details: data?.details,
                      requestId,
                      statusCode: status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : status,
                    },
                  },
                  status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : status,
                );
              }

              throw new HttpException(
                {
                  error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Failed to connect to listings service',
                    details: { service: 'listings-service' },
                    requestId,
                    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                  },
                },
                HttpStatus.SERVICE_UNAVAILABLE,
              );
            }),
          ),
      );

      if (response.status >= 400) {
        const errorData = response.data || {};
        if (errorData.error) {
          throw new HttpException(errorData, response.status);
        }
        const requestId = req.headers['x-request-id'] as string || 'unknown';
        throw new HttpException(
          {
            error: {
              code: response.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'BAD_REQUEST',
              message: errorData.message || 'Request failed',
              details: errorData.details,
              requestId,
              statusCode: response.status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : response.status,
            },
          },
          response.status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : response.status,
        );
      }

      if (response.status === 204) {
        return undefined;
      }
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      throw new HttpException(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal gateway error',
            requestId,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of buildings (admin)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'List of buildings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async findAll(@Req() req: Request): Promise<any> {
    const query = req.query;
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const path = `/v1/admin/buildings${queryString ? `?${queryString}` : ''}`;
    return this.proxyRequest('GET', path, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get building by ID (admin)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Building retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request): Promise<any> {
    return this.proxyRequest('GET', `/v1/admin/buildings/${id}`, req);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new building (admin)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiBody({ 
    description: 'Building data',
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  })
  @ApiResponse({ status: 201, description: 'Building created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async create(@Req() req: Request): Promise<any> {
    return this.proxyRequest('POST', '/v1/admin/buildings', req, req.body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update building by ID (admin)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)', type: String })
  @ApiBody({ 
    description: 'Updated building data',
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  })
  @ApiResponse({ status: 200, description: 'Building updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data or UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async update(@Param('id', new (await import('@nestjs/common')).ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request): Promise<any> {
    return this.proxyRequest('PUT', `/v1/admin/buildings/${id}`, req, req.body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete building by ID (admin)' })
  @ApiHeader({ name: 'x-admin-key', description: 'Admin API key', required: true })
  @ApiParam({ name: 'id', description: 'Building ID (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Building deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - admin key required' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async remove(@Param('id', new (await import('@nestjs/common')).ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request): Promise<any> {
    return this.proxyRequest('DELETE', `/v1/admin/buildings/${id}`, req);
  }
}
