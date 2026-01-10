import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { fromBuffer } from 'file-type';
import { StorageService } from './storage.service';
import { ImageProcessorService } from './image-processor.service';
import { EventService } from './event.service';
import { Asset } from '../entities/asset.entity';
import { ProcessingJob } from '../entities/processing-job.entity';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  // Magic bytes mapping: file extension -> MIME type
  private readonly ALLOWED_FILE_TYPES = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(ProcessingJob)
    private readonly processingJobRepository: Repository<ProcessingJob>,
    private readonly storageService: StorageService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Upload and process an image file
   * @param file Express Multer file object
   * @returns Created Asset entity
   */
  async uploadImage(file: Express.Multer.File): Promise<Asset> {
    // Validate file
    this.validateFile(file);

    const fileBuffer = file.buffer;
    const originalFilename = file.originalname;
    const fileSize = file.size;

    // Validate magic bytes (file signature) - SECURITY: Reject if magic bytes don't match
    const validatedMimeType = await this.validateMagicBytes(fileBuffer);
    if (!validatedMimeType) {
      throw new BadRequestException(
        'File type validation failed. The file signature does not match the allowed image types (JPEG, PNG, WebP).',
      );
    }

    // Get image metadata
    const metadata = await this.imageProcessor.getImageMetadata(fileBuffer);

    // Generate UUID-based filename for MinIO (sanitized, no special characters)
    // Store original filename only in database metadata
    const fileExtension = this.getFileExtensionFromMimeType(validatedMimeType);
    const uuidFilename = `${randomUUID()}.${fileExtension}`;
    const objectKey = `raw/${uuidFilename}`;
    const bucket = 'raw';

    let savedAsset: Asset | null = null;
    let fileUploaded = false;

    try {
      // Upload original to MinIO first
      await this.storageService.uploadFileFromBuffer(bucket, objectKey, fileBuffer, {
        'Content-Type': validatedMimeType,
        'original-filename': originalFilename,
      });
      fileUploaded = true;

      // Create asset record with pending status
      const asset = this.assetRepository.create({
        original_filename: originalFilename,
        mime_type: validatedMimeType,
        file_size: fileSize,
        bucket,
        object_key: objectKey,
        width: metadata.width,
        height: metadata.height,
        processing_status: 'pending',
      });

      savedAsset = await this.assetRepository.save(asset);

      // Update status to processing
      savedAsset.processing_status = 'processing';
      await this.assetRepository.save(savedAsset);

      // Process image asynchronously (for MVP, we do it immediately)
      await this.processImage(savedAsset.id, fileBuffer);

      return savedAsset;
    } catch (error) {
      this.logger.error(`Failed to upload image:`, error);

      // COMPENSATING TRANSACTION: If DB insert failed but file was uploaded, delete from MinIO
      if (fileUploaded && objectKey) {
        try {
          await this.storageService.deleteFile(bucket, objectKey);
          this.logger.log(`Compensating transaction: Deleted orphaned file ${bucket}/${objectKey}`);
        } catch (deleteError) {
          this.logger.error(
            `Failed to delete orphaned file ${bucket}/${objectKey} during compensating transaction:`,
            deleteError,
          );
          // Log but don't throw - we've already failed
        }
      }

      // Update asset status if it was created
      if (savedAsset) {
        savedAsset.processing_status = 'failed';
        savedAsset.processing_error = error instanceof Error ? error.message : 'Unknown error';
        try {
          await this.assetRepository.save(savedAsset);
        } catch (saveError) {
          this.logger.error(`Failed to update asset status after error:`, saveError);
        }
      }

      throw error;
    }
  }

  /**
   * Process an image: generate variants and upload them
   * @param assetId Asset ID
   * @param originalBuffer Original image buffer
   */
  private async processImage(assetId: string, originalBuffer: Buffer): Promise<void> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException(`Asset ${assetId} not found`);
    }

    // Create processing job
    const job = this.processingJobRepository.create({
      media_id: assetId,
      job_type: 'image_resize',
      status: 'processing',
      started_at: new Date(),
    });
    await this.processingJobRepository.save(job);

    try {
      // Generate variants
      const variants = await this.imageProcessor.generateVariants(originalBuffer);

      // Upload variants to MinIO and collect object keys
      const variantKeys: Record<string, string> = {};
      const bucket = 'buildings-media'; // Use buildings-media bucket for processed images

      for (const variant of variants) {
        const variantKey = `processed/${assetId}/${variant.size}.jpg`;
        await this.storageService.uploadFileFromBuffer(bucket, variantKey, variant.buffer, {
          'Content-Type': 'image/jpeg',
        });
        variantKeys[variant.size] = variantKey;
      }

      // Update asset with variant object keys (store keys, not URLs, as URLs expire)
      asset.variants = variantKeys;
      asset.processing_status = 'completed';
      await this.assetRepository.save(asset);

      // Update processing job
      job.status = 'completed';
      job.completed_at = new Date();
      await this.processingJobRepository.save(job);

      // Generate fresh URLs for the event (presigned URLs expire, so generate them fresh)
      const variantUrls: Record<string, string> = {};
      for (const [size, variantKey] of Object.entries(variantKeys)) {
        variantUrls[size] = await this.storageService.getFileUrl(bucket, variantKey);
      }

      // Publish event with fresh URLs
      await this.eventService.publishImageProcessed({
        mediaId: assetId,
        variants: variantUrls,
        status: 'completed',
      });

      this.logger.log(`Successfully processed image for asset ${assetId}`);
    } catch (error) {
      this.logger.error(`Failed to process image for asset ${assetId}:`, error);
      asset.processing_status = 'failed';
      asset.processing_error = error instanceof Error ? error.message : 'Unknown error';
      await this.assetRepository.save(asset);

      job.status = 'failed';
      job.error_message = error instanceof Error ? error.message : 'Unknown error';
      job.completed_at = new Date();
      await this.processingJobRepository.save(job);

      throw error;
    }
  }

  /**
   * Get media asset by ID with signed URLs
   * @param id Asset ID
   * @returns Asset with URLs
   */
  async getMediaById(id: string): Promise<Asset & { urls: { original: string; variants?: Record<string, string> } }> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Media asset ${id} not found`);
    }

    // Get signed URL for original
    const originalUrl = await this.storageService.getFileUrl(asset.bucket, asset.object_key);

    // Get signed URLs for variants if they exist
    let variantUrls: Record<string, string> | undefined;
    if (asset.variants) {
      variantUrls = {};
      const bucket = 'buildings-media';
      for (const [size, variantKey] of Object.entries(asset.variants)) {
        // variantKey is the object key stored in the database
        variantUrls[size] = await this.storageService.getFileUrl(bucket, variantKey);
      }
    }

    return {
      ...asset,
      urls: {
        original: originalUrl,
        variants: variantUrls,
      },
    };
  }

  /**
   * Validate uploaded file
   * @param file Express Multer file object
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Validate file magic bytes (file signature) to ensure actual file type matches declared type
   * SECURITY: This prevents file type spoofing by checking the actual file buffer signature
   * @param buffer File buffer
   * @returns Validated MIME type or null if validation fails
   */
  private async validateMagicBytes(buffer: Buffer): Promise<string | null> {
    try {
      const fileType = await fromBuffer(buffer);
      if (!fileType) {
        this.logger.warn('File type detection failed: No magic bytes match found');
        return null;
      }

      const detectedMimeType = fileType.mime;
      const detectedExt = fileType.ext;

      // Check if detected MIME type is in our allowed list
      if (!this.ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
        this.logger.warn(
          `Magic bytes validation failed: Detected MIME type ${detectedMimeType} (ext: ${detectedExt}) is not allowed`,
        );
        return null;
      }

      // Additional check: ensure the extension matches the MIME type
      const expectedMimeType = this.ALLOWED_FILE_TYPES[detectedExt as keyof typeof this.ALLOWED_FILE_TYPES];
      if (!expectedMimeType || expectedMimeType !== detectedMimeType) {
        this.logger.warn(
          `Magic bytes validation failed: Extension ${detectedExt} does not match MIME type ${detectedMimeType}`,
        );
        return null;
      }

      this.logger.log(`Magic bytes validation passed: ${detectedMimeType} (${detectedExt})`);
      return detectedMimeType;
    } catch (error) {
      this.logger.error('Error during magic bytes validation:', error);
      return null;
    }
  }

  /**
   * Get file extension from MIME type
   * @param mimeType MIME type
   * @returns File extension
   */
  private getFileExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return mimeToExt[mimeType] || 'jpg';
  }
}
