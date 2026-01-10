import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';

@ApiTags('media')
@Controller('api/v1/media')
export class MediaController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getMediaServiceUrl(): string {
    return (
      this.configService.get<string>('MEDIA_SERVICE_URL') ||
      'http://localhost:3003'
    );
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    const baseUrl = this.getMediaServiceUrl();
    const url = `${baseUrl}/v1/media/upload`;

    try {
      // Create FormData for forwarding using form-data package
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname || 'upload',
        contentType: file.mimetype,
      });

      const headers = {
        ...formData.getHeaders(),
      };

      const response = await firstValueFrom(
        this.httpService.post(url, formData, {
          headers,
          timeout: 30000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }).pipe(
          timeout(30000),
          catchError((error: AxiosError) => {
            throw new HttpException(
              {
                error: {
                  code: 'SERVICE_UNAVAILABLE',
                  message: 'Media service is currently unavailable',
                  details: { service: 'media-service' },
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
      throw new HttpException('Internal Media Gateway Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media asset by ID' })
  @ApiParam({ name: 'id', description: 'Media asset ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Media asset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Media asset not found' })
  async getMedia(@Param('id') id: string) {
    const baseUrl = this.getMediaServiceUrl();
    const url = `${baseUrl}/v1/media/${id}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 }).pipe(
          timeout(5000),
          catchError((error: AxiosError) => {
            throw new HttpException(
              {
                error: {
                  code: 'SERVICE_UNAVAILABLE',
                  message: 'Media service is currently unavailable',
                  details: { service: 'media-service' },
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
      throw new HttpException('Internal Media Gateway Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
