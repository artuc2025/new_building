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
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';

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
              // Normalize axios errors
              if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                throw new HttpException(
                  {
                    statusCode: HttpStatus.GATEWAY_TIMEOUT,
                    message: 'Request to listings service timed out',
                    error: 'Gateway Timeout',
                    timestamp: new Date().toISOString(),
                    path: req.url,
                  },
                  HttpStatus.GATEWAY_TIMEOUT,
                );
              }

              if (error.response) {
                // Forward error response from upstream service
                const status = error.response.status;
                const data = error.response.data;
                throw new HttpException(
                  {
                    statusCode: status,
                    message: (data as any)?.message || error.message,
                    error: (data as any)?.error || 'Bad Gateway',
                    details: (data as any)?.details,
                    timestamp: new Date().toISOString(),
                    path: req.url,
                  },
                  status,
                );
              }

              // Network or other errors
              throw new HttpException(
                {
                  statusCode: HttpStatus.BAD_GATEWAY,
                  message: 'Failed to connect to listings service',
                  error: 'Bad Gateway',
                  timestamp: new Date().toISOString(),
                  path: req.url,
                },
                HttpStatus.BAD_GATEWAY,
              );
            }),
          ),
      );

      // Handle non-2xx status codes
      if (response.status >= 400) {
        const errorData = response.data || {};
        throw new HttpException(
          {
            statusCode: response.status,
            message: errorData.message || 'Request failed',
            error: errorData.error || 'Bad Request',
            details: errorData.details,
            timestamp: new Date().toISOString(),
            path: req.url,
          },
          response.status,
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
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal gateway error',
          error: 'Internal Server Error',
          timestamp: new Date().toISOString(),
          path: req.url,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(@Req() req: Request, @Query() query: any): Promise<any> {
    const queryString = new URLSearchParams(query).toString();
    const path = `/v1/buildings${queryString ? `?${queryString}` : ''}`;
    return this.proxyRequest('GET', path, req);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<any> {
    return this.proxyRequest('GET', `/v1/buildings/${id}`, req);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @Req() req: Request): Promise<any> {
    return this.proxyRequest('POST', '/v1/buildings', req, body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: Request): Promise<any> {
    return this.proxyRequest('PUT', `/v1/buildings/${id}`, req, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    await this.proxyRequest('DELETE', `/v1/buildings/${id}`, req);
  }
}

