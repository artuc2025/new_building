import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection, JetStreamClient, JSONCodec } from 'nats';
import { randomUUID } from 'crypto';

export interface BuildingEventPayload {
  id: string;
  title?: Record<string, string>;
  address?: Record<string, string>;
  description?: Record<string, string>;
  location?: { lat: number; lng: number };
  pricePerM2Min?: number;
  pricePerM2Max?: number;
  areaMin?: number;
  areaMax?: number;
  floors?: number;
  commissioningDate?: string;
  developerId?: string;
  developerName?: Record<string, string>;
  regionId?: string;
  regionName?: Record<string, string>;
  status?: string;
  updatedAt?: string;
  thumbnail?: string;
}

export interface BuildingEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: BuildingEventPayload;
  metadata: {
    timestamp: string;
    userId?: string;
  };
}

@Injectable()
export class EventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventService.name);
  private natsConnection: NatsConnection | null = null;
  private jetStreamClient: JetStreamClient | null = null;
  private readonly jsonCodec = JSONCodec<BuildingEvent>();

  constructor(private readonly configService: ConfigService) {}

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
      const natsUrl = this.configService.get<string>('NATS_URL', 'nats://localhost:4222');
      this.natsConnection = await connect({ servers: natsUrl });
      this.jetStreamClient = this.natsConnection.jetstream();
      this.logger.log('Connected to NATS JetStream');
    } catch (error) {
      this.logger.error('Failed to connect to NATS:', error);
      // Don't throw - allow service to start without NATS
    }
  }

  async publishBuildingCreated(payload: BuildingEventPayload): Promise<void> {
    await this.publishEvent('listings.building.created', payload);
  }

  async publishBuildingUpdated(payload: BuildingEventPayload): Promise<void> {
    await this.publishEvent('listings.building.updated', payload);
  }

  async publishBuildingPublished(payload: BuildingEventPayload): Promise<void> {
    await this.publishEvent('listings.building.published', payload);
  }

  async publishBuildingDeleted(buildingId: string): Promise<void> {
    await this.publishEvent('listings.building.deleted', {
      id: buildingId,
    });
  }

  private async publishEvent(eventType: string, payload: BuildingEventPayload): Promise<void> {
    if (!this.jetStreamClient) {
      this.logger.warn(`Cannot publish event ${eventType}: JetStream not connected`);
      return;
    }

    try {
      const event: BuildingEvent = {
        eventId: randomUUID(),
        eventType,
        aggregateId: payload.id,
        payload,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };

      const subject = eventType;
      const data = this.jsonCodec.encode(event);

      await this.jetStreamClient.publish(subject, data, {
        msgID: event.eventId,
      });

      this.logger.log(`Published event: ${eventType} for building ${payload.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${eventType}:`, error);
      // Don't throw - event publishing should not break the main flow
    }
  }
}
