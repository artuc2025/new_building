import {
  Controller,
  Get,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';

@ApiTags('search')
@Controller('api/v1/search')
export class SearchController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getSearchServiceUrl(): string {
    return (
      this.configService.get<string>('SEARCH_SERVICE_URL') ||
      'http://localhost:3002'
    );
  }

  @Get('buildings')
  @ApiOperation({ summary: 'Search buildings (full-text + faceted)' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 503, description: 'Search service unavailable' })
  async searchBuildings(@Req() req: Request) {
    const baseUrl = this.getSearchServiceUrl();
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${baseUrl}/v1/search/buildings${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 }).pipe(
          timeout(5000),
          catchError((error: AxiosError) => {
            throw new HttpException(
              {
                error: {
                  code: 'SERVICE_UNAVAILABLE',
                  message: 'Search service is currently unavailable',
                  details: { service: 'search-service' },
                  statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                },
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Internal Search Gateway Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
