import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { connect, NatsConnection, JetStreamClient, JsMsg, JSONCodec } from 'nats';
import { MeilisearchService } from './meilisearch.service';
import { BuildingLocation, IndexSyncStatus, Inbox } from '../entities';

interface BuildingEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: {
    id: string;
    title?: Record<string, string>;
    address?: Record<string, string>;
    description?: Record<string, string>;
    location?: string; // WKT format: "POINT(lng lat)"
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
  };
  metadata?: {
    timestamp?: string;
    userId?: string;
  };
}

@Injectable()
export class SearchSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchSyncService.name);
  private natsConnection: NatsConnection | null = null;
  private jetStreamClient: JetStreamClient | null = null;
  private readonly jsonCodec = JSONCodec<BuildingEvent>();
  private consumers: any[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly meilisearchService: MeilisearchService,
    @InjectRepository(BuildingLocation)
    private readonly buildingLocationRepository: Repository<BuildingLocation>,
    @InjectRepository(IndexSyncStatus)
    private readonly indexSyncStatusRepository: Repository<IndexSyncStatus>,
    @InjectRepository(Inbox)
    private readonly inboxRepository: Repository<Inbox>,
  ) {}

  async onModuleInit() {
    await this.connectToNATS();
    await this.setupConsumers();
  }

  async onModuleDestroy() {
    // Close all consumers
    for (const consumer of this.consumers) {
      try {
        await consumer.destroy();
      } catch (error) {
        this.logger.error('Error destroying consumer:', error);
      }
    }

    // Close NATS connection
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
      throw error;
    }
  }

  private async setupConsumers() {
    if (!this.jetStreamClient) {
      throw new Error('JetStream client not initialized');
    }

    // Subscribe to all building events using a single consumer
    // The stream should match subjects: "listings.building.*"
    const streamName = 'listings-events';
    const durableName = 'search-consumer';

    try {
      // Try to get or create consumer
      let consumer;
      try {
        consumer = await this.jetStreamClient.consumers.get(streamName, durableName);
        this.logger.log(`Found existing consumer: ${durableName}`);
      } catch (error: any) {
        // Consumer doesn't exist, create it
        if (error.code === '404' || error.message?.includes('not found')) {
          this.logger.log(`Creating consumer: ${durableName}`);
          consumer = await this.jetStreamClient.consumers.create(streamName, {
            durable_name: durableName,
            ack_policy: 'explicit',
            filter_subject: 'listings.building.>',
            max_deliver: 5,
            ack_wait: 30000, // 30 seconds
          });
          this.logger.log(`Consumer created: ${durableName}`);
        } else {
          throw error;
        }
      }

      // Start consuming messages
      const iter = await consumer.consume();
      this.consumers.push(consumer);

      // Process messages asynchronously
      this.processMessages(iter).catch((error) => {
        this.logger.error(`Error processing messages:`, error);
      });

      this.logger.log(`Consumer set up for stream: ${streamName}`);
    } catch (error: any) {
      this.logger.error(`Failed to set up consumer:`, error);
      // Don't throw - allow service to start even if NATS is not available
      // Consumer will retry when NATS becomes available
    }
  }

  private async processMessages(iter: AsyncIterable<JsMsg>) {
    for await (const msg of iter) {
      try {
        // Extract subject from message metadata
        const subject = msg.subject;
        const event = this.jsonCodec.decode(msg.data) as BuildingEvent;
        
        // Ensure event has required fields
        if (!event.eventId) {
          // Try to extract from message headers or generate one
          const eventIdHeader = msg.headers?.get('eventId') || msg.headers?.get('event-id');
          event.eventId = eventIdHeader || `msg-${msg.seq}`;
        }
        if (!event.eventType) {
          event.eventType = subject;
        }
        if (!event.aggregateId && event.payload?.id) {
          event.aggregateId = event.payload.id;
        }

        await this.handleEvent(event, subject);
        msg.ack();
      } catch (error) {
        this.logger.error(`Error processing message from ${msg.subject}:`, error);
        // Don't ack - let NATS redeliver
        // After max deliveries, it will go to DLQ
      }
    }
  }

  /**
   * Handle building event with idempotency check.
   */
  private async handleEvent(event: BuildingEvent, eventType: string): Promise<void> {
    // Idempotency check: use inbox pattern
    const existingInbox = await this.inboxRepository.findOne({
      where: { eventId: event.eventId },
    });

    if (existingInbox) {
      if (existingInbox.status === 'processed') {
        this.logger.debug(`Event ${event.eventId} already processed, skipping`);
        return; // Already processed, skip
      }
      // If status is 'pending' or 'failed', retry processing
      this.logger.debug(`Retrying event ${event.eventId}`);
    } else {
      // New event, insert into inbox
      const inbox = this.inboxRepository.create({
        eventId: event.eventId,
        eventType: eventType,
        aggregateId: event.aggregateId,
        payload: event.payload as any,
        status: 'pending',
      });
      await this.inboxRepository.save(inbox);
    }

    try {
      // Process event based on type
      if (eventType === 'listings.building.deleted') {
        await this.handleBuildingDeleted(event);
      } else {
        await this.handleBuildingUpsert(event);
      }

      // Mark as processed
      await this.inboxRepository.update(
        { eventId: event.eventId },
        {
          status: 'processed',
          processedAt: new Date(),
          errorMessage: null,
        },
      );

      // Update sync status
      await this.updateSyncStatus(event.aggregateId, 'success');
    } catch (error: any) {
      this.logger.error(`Failed to process event ${event.eventId}:`, error);

      // Mark as failed
      await this.inboxRepository.update(
        { eventId: event.eventId },
        {
          status: 'failed',
          errorMessage: error.message || String(error),
        },
      );

      // Update sync status
      await this.updateSyncStatus(event.aggregateId, 'error', error.message);

      // Re-throw to prevent ack (let NATS redeliver)
      throw error;
    }
  }

  /**
   * Handle building created/updated/published events.
   */
  private async handleBuildingUpsert(event: BuildingEvent): Promise<void> {
    const { payload } = event;

    // Action A: Update Meilisearch index
    const meilisearchDocument = {
      buildingId: payload.id,
      title: payload.title || {},
      address: payload.address || {},
      description: payload.description || {},
      pricePerM2Min: payload.pricePerM2Min,
      pricePerM2Max: payload.pricePerM2Max,
      areaMin: payload.areaMin,
      areaMax: payload.areaMax,
      floors: payload.floors,
      commissioningDate: payload.commissioningDate,
      developerId: payload.developerId,
      developerName: payload.developerName || {},
      regionId: payload.regionId,
      regionName: payload.regionName || {},
      location: this.parseLocation(payload.location),
      status: payload.status || 'draft',
      updatedAt: payload.updatedAt || new Date().toISOString(),
    };

    await this.meilisearchService.addDocument(meilisearchDocument);

    // Action B: Upsert building_locations read-model
    if (payload.location) {
      const location = this.parseLocation(payload.location);
      const metadata = {
        price: payload.pricePerM2Min,
        title: payload.title,
        thumbnail: payload.thumbnail,
      };

      await this.buildingLocationRepository.upsert(
        {
          buildingId: payload.id,
          location: payload.location, // Keep as WKT for PostGIS
          metadata,
        },
        ['buildingId'],
      );
    }

    this.logger.debug(`Building ${payload.id} synced to Meilisearch and read-model`);
  }

  /**
   * Handle building deleted event.
   */
  private async handleBuildingDeleted(event: BuildingEvent): Promise<void> {
    const buildingId = event.aggregateId || event.payload.id;

    // Action A: Delete from Meilisearch
    await this.meilisearchService.deleteDocument(buildingId);

    // Action B: Delete from building_locations read-model
    await this.buildingLocationRepository.delete({ buildingId });

    this.logger.debug(`Building ${buildingId} deleted from Meilisearch and read-model`);
  }

  /**
   * Parse PostGIS WKT location to {lat, lng} object.
   */
  private parseLocation(location?: string): { lat: number; lng: number } | null {
    if (!location) return null;

    // Parse WKT: "POINT(lng lat)"
    const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }

    return null;
  }

  /**
   * Update index sync status.
   */
  private async updateSyncStatus(
    entityId: string,
    status: 'success' | 'error' | 'pending',
    errorMessage?: string,
  ): Promise<void> {
    await this.indexSyncStatusRepository.upsert(
      {
        entityType: 'building',
        entityId,
        lastSyncedAt: new Date(),
        status,
        errorMessage,
        retryCount: status === 'error' ? 1 : 0,
      },
      ['entityType', 'entityId'],
    );
  }
}
