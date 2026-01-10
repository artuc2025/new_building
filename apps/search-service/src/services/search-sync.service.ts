import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { connect, NatsConnection, JetStreamClient, JetStreamManager, JsMsg, JSONCodec, AckPolicy, RetentionPolicy } from 'nats';
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
    location?: { lat: number; lng: number }; // JSON object from events (see README 6.2.1)
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
  private jetStreamManager: JetStreamManager | null = null;
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
      this.jetStreamManager = await this.natsConnection.jetstreamManager();
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
    const subject = 'listings.building.>';
    const durableName = 'search-consumer';

    try {
      // First, ensure the stream exists
      await this.ensureStreamExists(streamName, subject);
      
      // Use ordered consumer - simplest approach, no ack required
      this.logger.log(`Setting up consumer: ${durableName}`);
      
      // Subscribe with ordered consumer - best for read-only event processing
      const consumer = await this.jetStreamClient.consumers.get(streamName, durableName).catch(async () => {
        // Consumer doesn't exist, create it
        return await this.jetStreamManager!.consumers.add(streamName, {
          durable_name: durableName,
          ack_policy: AckPolicy.Explicit,
          filter_subject: subject,
          max_deliver: 5,
        });
      });
      
      // Get messages from the consumer
      this.processMessagesFromConsumer(streamName, durableName).catch((error) => {
        this.logger.error(`Error processing messages:`, error);
      });

      this.consumers.push(consumer);
      this.logger.log(`Consumer set up: ${durableName}`);
    } catch (error: any) {
      this.logger.error(`Failed to set up consumer:`, error);
      // Don't throw - allow service to start even if NATS is not available
      // Consumer will retry when NATS becomes available
    }
  }

  private async ensureStreamExists(streamName: string, subject: string) {
    try {
      if (!this.jetStreamManager) {
        throw new Error('JetStream manager not available');
      }

      try {
        await this.jetStreamManager.streams.info(streamName);
        this.logger.log(`Stream ${streamName} already exists`);
      } catch (error: any) {
        if (error.code === '404' || error.message?.includes('not found')) {
          // Stream doesn't exist, create it
          this.logger.log(`Creating stream: ${streamName}`);
          await this.jetStreamManager.streams.add({
            name: streamName,
            subjects: [subject.replace('.>', '.*')], // Convert .> to .* for stream subjects
            retention: RetentionPolicy.Interest,
            max_age: 7 * 24 * 60 * 60 * 1000 * 1000 * 1000, // 7 days in nanoseconds
            duplicate_window: 2 * 60 * 1000 * 1000 * 1000, // 2 minutes in nanoseconds
          });
          this.logger.log(`Stream ${streamName} created`);
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      this.logger.warn(`Could not ensure stream exists: ${error.message}. Stream may need to be created manually.`);
      // Don't throw - allow service to start even if stream setup fails
    }
  }

  private async processMessagesFromConsumer(streamName: string, consumerName: string) {
    try {
      if (!this.jetStreamClient) {
        throw new Error('JetStream client not initialized');
      }

      const consumer = await this.jetStreamClient.consumers.get(streamName, consumerName);
      
      // Continuously fetch and process messages
      while (true) {
        try {
          const messages = await consumer.fetch({ max_messages: 10, expires: 5000 });
          
          for await (const msg of messages) {
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
        } catch (error: any) {
          // If no messages or timeout, wait before next fetch
          if (error.code === '408' || error.message?.includes('timeout') || error.message?.includes('no messages')) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            this.logger.error(`Error fetching messages:`, error);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in message consumption:`, error);
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
    // Pass the location JSON object directly to Meilisearch (no conversion needed)
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
      location: payload.location, // Pass JSON object directly to Meilisearch
      status: payload.status || 'draft',
      updatedAt: payload.updatedAt || new Date().toISOString(),
    };

    await this.meilisearchService.addDocument(meilisearchDocument);

    // Action B: Upsert building_locations read-model
    if (payload.location) {
      // Use Raw SQL to handle PostGIS GEOGRAPHY type
      const metadata = {
        price: payload.pricePerM2Min,
        title: payload.title,
        thumbnail: payload.thumbnail,
      };

      // Use raw SQL for upsert with PostGIS
      await this.buildingLocationRepository.query(
        `
        INSERT INTO search.building_locations (building_id, location, metadata, created_at, updated_at)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, NOW(), NOW())
        ON CONFLICT (building_id)
        DO UPDATE SET
          location = ST_SetSRID(ST_MakePoint($2, $3), 4326),
          metadata = $4,
          updated_at = NOW()
        `,
        [payload.id, payload.location.lng, payload.location.lat, JSON.stringify(metadata)]
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
   * Convert JSON location object to PostGIS WKT format.
   * @param location - JSON object { lat: number; lng: number }
   * @returns WKT string "POINT(lng lat)" for PostGIS GEOGRAPHY storage
   */
  private convertToWKT(location: { lat: number; lng: number }): string {
    // PostGIS uses (longitude, latitude) order for POINT
    return `POINT(${location.lng} ${location.lat})`;
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
