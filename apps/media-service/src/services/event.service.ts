import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection, JetStreamClient, JSONCodec } from 'nats';

export interface MediaImageProcessedEvent {
  mediaId: string;
  variants: Record<string, string>; // { thumbnail: 'url', medium: 'url', large: 'url' }
  status: 'completed';
}

@Injectable()
export class EventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventService.name);
  private natsConnection: NatsConnection | null = null;
  private jetStreamClient: JetStreamClient | null = null;
  private readonly jsonCodec = JSONCodec<MediaImageProcessedEvent>();

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
    await this.connectToNATS();
  }

  async onModuleDestroy() {
    if (this.natsConnection) {
      await this.natsConnection.close();
      this.logger.log('NATS connection closed');
    }
  }

  private async connectToNATS() {
    try {
      const natsUrl = this.configService?.get<string>('NATS_URL') || process.env.NATS_URL || 'nats://localhost:4222';
      this.natsConnection = await connect({ servers: natsUrl });
      this.jetStreamClient = this.natsConnection.jetstream();
      this.logger.log('Connected to NATS JetStream');
    } catch (error) {
      this.logger.error('Failed to connect to NATS:', error);
      // Don't throw - allow service to start even if NATS is not available
      // Events will be silently dropped if NATS is unavailable
    }
  }

  /**
   * Publish media.image.processed event
   * @param event Event payload
   */
  async publishImageProcessed(event: MediaImageProcessedEvent): Promise<void> {
    if (!this.jetStreamClient) {
      this.logger.warn('NATS not connected, skipping event publication');
      return;
    }

    try {
      const subject = 'media.image.processed';
      const data = this.jsonCodec.encode(event);
      await this.jetStreamClient.publish(subject, data);
      this.logger.log(`Published event: ${subject} for mediaId: ${event.mediaId}`);
    } catch (error) {
      this.logger.error('Failed to publish media.image.processed event:', error);
      // Don't throw - event publishing failure shouldn't break the upload flow
    }
  }
}
