import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from '../services/media.service';
import { Asset } from '../entities/asset.entity';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('v1/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Upload an image file
   * POST /v1/media/upload
   * Accepts multipart/form-data with 'file' field
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<Asset> {
    if (!file) {
      throw new BadRequestException('No file provided. Please upload a file using the "file" field.');
    }

    return this.mediaService.uploadImage(file);
  }

  /**
   * Get media asset by ID with signed URLs
   * GET /v1/media/:id
   */
  @Get(':id')
  async getMedia(@Param('id') id: string): Promise<Asset & { urls: { original: string; variants?: Record<string, string> } }> {
    return this.mediaService.getMediaById(id);
  }
}
