import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ImageVariant {
  size: string;
  width: number;
  height: number;
  buffer: Buffer;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  // Variant definitions: thumbnail (200x200), medium (800x800), large (1200x1200)
  private readonly variants = {
    thumbnail: { width: 200, height: 200 },
    medium: { width: 800, height: 800 },
    large: { width: 1200, height: 1200 },
  };

  /**
   * Get image metadata (width, height, format, size)
   */
  async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error('Failed to get image metadata:', error);
      throw new Error('Invalid image file');
    }
  }

  /**
   * Generate all image variants (thumbnail, medium, large)
   * @param buffer Original image buffer
   * @returns Array of image variants
   */
  async generateVariants(buffer: Buffer): Promise<ImageVariant[]> {
    const variants: ImageVariant[] = [];

    try {
      for (const [sizeName, dimensions] of Object.entries(this.variants)) {
        const variantBuffer = await this.resizeImage(buffer, dimensions.width, dimensions.height);
        variants.push({
          size: sizeName,
          width: dimensions.width,
          height: dimensions.height,
          buffer: variantBuffer,
        });
        this.logger.log(`Generated ${sizeName} variant: ${dimensions.width}x${dimensions.height}`);
      }

      return variants;
    } catch (error) {
      this.logger.error('Failed to generate image variants:', error);
      throw new Error('Failed to process image variants');
    }
  }

  /**
   * Resize an image to specified dimensions
   * Maintains aspect ratio and fits within the dimensions
   * @param buffer Original image buffer
   * @param width Target width
   * @param height Target height
   * @returns Resized image buffer
   */
  private async resizeImage(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 }) // Convert to JPEG with good quality
        .toBuffer();
    } catch (error) {
      this.logger.error(`Failed to resize image to ${width}x${height}:`, error);
      throw error;
    }
  }

  /**
   * Generate a specific variant
   * @param buffer Original image buffer
   * @param sizeName Variant size name (thumbnail, medium, large)
   * @returns Image variant
   */
  async generateVariant(buffer: Buffer, sizeName: keyof typeof this.variants): Promise<ImageVariant> {
    const dimensions = this.variants[sizeName];
    if (!dimensions) {
      throw new Error(`Unknown variant size: ${sizeName}`);
    }

    try {
      const variantBuffer = await this.resizeImage(buffer, dimensions.width, dimensions.height);
      return {
        size: sizeName,
        width: dimensions.width,
        height: dimensions.height,
        buffer: variantBuffer,
      };
    } catch (error) {
      this.logger.error(`Failed to generate ${sizeName} variant:`, error);
      throw error;
    }
  }

  /**
   * Validate if the buffer is a valid image
   * @param buffer Image buffer
   * @returns Promise<boolean>
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata.format !== undefined && ['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format);
    } catch (error) {
      return false;
    }
  }
}
