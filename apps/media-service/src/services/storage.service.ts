import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client | null = null;
  private readonly buckets: string[] = ['buildings-media', 'blog-media', 'raw'];

  constructor(
    @Optional()
    @Inject(ConfigService)
    private readonly configService: ConfigService | undefined,
  ) {
    if (!this.configService) {
      this.logger.warn('ConfigService is not available - using environment variables directly');
    }
  }

  async onModuleInit() {
    // Initialize MinIO client - use ConfigService if available, otherwise use process.env
    const endPoint = this.configService?.get<string>('MINIO_ENDPOINT') || process.env.MINIO_ENDPOINT || 'localhost';
    const port = this.configService?.get<number>('MINIO_PORT') || parseInt(process.env.MINIO_PORT || '9000', 10);
    // Convert MINIO_USE_SSL to boolean - handle both string and boolean values
    const useSSLValue = this.configService?.get<string | boolean>('MINIO_USE_SSL') ?? process.env.MINIO_USE_SSL;
    const useSSL = typeof useSSLValue === 'boolean' ? useSSLValue : useSSLValue === 'true';
    const accessKey = this.configService?.get<string>('MINIO_ROOT_USER') || process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretKey = this.configService?.get<string>('MINIO_ROOT_PASSWORD') || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';

    this.minioClient = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    this.logger.log(`MinIO client initialized: ${endPoint}:${port}`);

    // Ensure buckets exist
    await this.ensureBucketsExist();
  }

  /**
   * Ensure all required buckets exist, create them if they don't
   */
  private async ensureBucketsExist(): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    for (const bucketName of this.buckets) {
      try {
        const exists = await this.minioClient.bucketExists(bucketName);
        if (!exists) {
          await this.minioClient.makeBucket(bucketName, 'us-east-1');
          this.logger.log(`Created bucket: ${bucketName}`);
        } else {
          this.logger.log(`Bucket already exists: ${bucketName}`);
        }
      } catch (error) {
        this.logger.error(`Failed to ensure bucket ${bucketName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Upload a file to MinIO
   * @param bucket Bucket name
   * @param objectKey Object key (path) in the bucket
   * @param filePath Path to the file to upload
   * @param metadata Optional metadata
   * @returns Promise<void>
   */
  async uploadFile(
    bucket: string,
    objectKey: string,
    filePath: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    try {
      await this.minioClient.fPutObject(bucket, objectKey, filePath, metadata);
      this.logger.log(`Uploaded file: ${bucket}/${objectKey}`);
    } catch (error) {
      this.logger.error(`Failed to upload file ${bucket}/${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Upload a file from buffer to MinIO
   * @param bucket Bucket name
   * @param objectKey Object key (path) in the bucket
   * @param buffer File buffer
   * @param metadata Optional metadata
   * @returns Promise<void>
   */
  async uploadFileFromBuffer(
    bucket: string,
    objectKey: string,
    buffer: Buffer,
    metadata?: Record<string, string>,
  ): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    try {
      await this.minioClient.putObject(bucket, objectKey, buffer, buffer.length, metadata);
      this.logger.log(`Uploaded file from buffer: ${bucket}/${objectKey}`);
    } catch (error) {
      this.logger.error(`Failed to upload file from buffer ${bucket}/${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Get a presigned URL for accessing a file
   * @param bucket Bucket name
   * @param objectKey Object key (path) in the bucket
   * @param expiry Expiry time in seconds (default: 7 days)
   * @returns Presigned URL
   */
  async getFileUrl(bucket: string, objectKey: string, expiry: number = 604800): Promise<string> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const url = await this.minioClient.presignedGetObject(bucket, objectKey, expiry);
      return url;
    } catch (error) {
      this.logger.error(`Failed to get file URL for ${bucket}/${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Get a public URL (if bucket is public)
   * @param bucket Bucket name
   * @param objectKey Object key (path) in the bucket
   * @returns Public URL
   */
  getPublicUrl(bucket: string, objectKey: string): string {
    const endPoint = this.configService?.get<string>('MINIO_ENDPOINT') || process.env.MINIO_ENDPOINT || 'localhost';
    const port = this.configService?.get<number>('MINIO_PORT') || parseInt(process.env.MINIO_PORT || '9000', 10);
    const useSSL = this.configService?.get<boolean>('MINIO_USE_SSL') || process.env.MINIO_USE_SSL === 'true';
    const protocol = useSSL ? 'https' : 'http';
    return `${protocol}://${endPoint}:${port}/${bucket}/${objectKey}`;
  }

  /**
   * Delete a file from MinIO
   * @param bucket Bucket name
   * @param objectKey Object key (path) in the bucket
   * @returns Promise<void>
   */
  async deleteFile(bucket: string, objectKey: string): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    try {
      await this.minioClient.removeObject(bucket, objectKey);
      this.logger.log(`Deleted file: ${bucket}/${objectKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${bucket}/${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists
   * @param bucket Bucket name
   * @param objectKey Object key (path) in the bucket
   * @returns Promise<boolean>
   */
  async fileExists(bucket: string, objectKey: string): Promise<boolean> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    try {
      await this.minioClient.statObject(bucket, objectKey);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }
}
