import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index, Settings } from 'meilisearch';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeiliSearch;
  private buildingsIndex: Index;
  private readonly indexName = 'buildings';

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MEILISEARCH_HOST', 'http://localhost:7700');
    // Default key matches docker-compose.yml default
    // In development, Meilisearch might allow unauthenticated access
    const masterKey = this.configService.get<string>(
      'MEILISEARCH_MASTER_KEY',
      process.env.NODE_ENV === 'development' ? undefined : 'dev_master_key_change_in_prod',
    );

    const clientConfig: any = { host };
    if (masterKey) {
      clientConfig.apiKey = masterKey;
    }

    this.client = new MeiliSearch(clientConfig);

    this.logger.debug(
      `Meilisearch client initialized with host: ${host}, ${masterKey ? 'with API key' : 'without API key (dev mode)'}`,
    );
  }

  async onModuleInit() {
    // Try to initialize index, but don't crash if Meilisearch is unavailable
    try {
      await this.ensureIndex();
    } catch (error: any) {
      // Log error but don't throw - allow service to start even if Meilisearch is unavailable
      this.logger.warn(
        `Meilisearch initialization failed. Service will start but search functionality may be limited. ` +
        `Error: ${error.message || error}. ` +
        `Please check: 1) Meilisearch is running, 2) MEILISEARCH_HOST is correct, 3) MEILISEARCH_MASTER_KEY is correct.`,
      );
      // Don't throw - allow service to continue
    }
  }

  /**
   * Ensures the buildings index exists and is configured correctly.
   */
  private async ensureIndex() {
    try {
      // Check if index exists
      try {
        this.buildingsIndex = this.client.index(this.indexName);
        await this.buildingsIndex.getRawInfo();
        this.logger.log(`Index ${this.indexName} already exists`);
      } catch (error: any) {
        // Index doesn't exist, create it
        // Check for various error patterns that indicate index not found
        const isIndexNotFound = 
          error.code === 'index_not_found' || 
          error.errorCode === 'index_not_found' ||
          (error.message && error.message.includes('not found')) ||
          (error.type === 'index_not_found');
        
        if (isIndexNotFound) {
          this.logger.log(`Creating index ${this.indexName}`);
          await this.client.createIndex(this.indexName, {
            primaryKey: 'buildingId',
          });
          this.buildingsIndex = this.client.index(this.indexName);
          this.logger.log(`Index ${this.indexName} created successfully`);
        } else {
          throw error;
        }
      }

      // Configure index settings
      const settings: Settings = {
        filterableAttributes: [
          'pricePerM2Min',
          'areaMin',
          'regionId',
          'developerId',
          'status',
        ],
        sortableAttributes: [
          'pricePerM2Min',
          'updatedAt',
          'commissioningDate',
        ],
        searchableAttributes: [
          'title',
          'address',
          'description',
          'developerName',
          'regionName',
        ],
      };

      await this.buildingsIndex.updateSettings(settings);
      this.logger.log(`Index ${this.indexName} configured successfully`);
    } catch (error) {
      this.logger.error(`Failed to ensure index ${this.indexName}:`, error);
      throw error;
    }
  }

  /**
   * Get the buildings index.
   */
  getBuildingsIndex(): Index {
    if (!this.buildingsIndex) {
      this.buildingsIndex = this.client.index(this.indexName);
    }
    return this.buildingsIndex;
  }

  /**
   * Add or update a document in the index.
   */
  async addDocument(document: any): Promise<void> {
    if (!this.buildingsIndex) {
      // Try to ensure index exists before adding document
      try {
        await this.ensureIndex();
      } catch (error) {
        this.logger.error(`Cannot add document: Meilisearch index not available. Error: ${error}`);
        throw new Error('Meilisearch index not available');
      }
    }

    try {
      await this.getBuildingsIndex().addDocuments([document], { primaryKey: 'buildingId' });
      this.logger.debug(`Document ${document.buildingId} added/updated in index`);
    } catch (error) {
      this.logger.error(`Failed to add document ${document.buildingId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document from the index.
   */
  async deleteDocument(buildingId: string): Promise<void> {
    if (!this.buildingsIndex) {
      // Try to ensure index exists before deleting document
      try {
        await this.ensureIndex();
      } catch (error) {
        this.logger.error(`Cannot delete document: Meilisearch index not available. Error: ${error}`);
        throw new Error('Meilisearch index not available');
      }
    }

    try {
      await this.getBuildingsIndex().deleteDocument(buildingId);
      this.logger.debug(`Document ${buildingId} deleted from index`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${buildingId}:`, error);
      throw error;
    }
  }

  /**
   * Search documents in the index.
   */
  async search(query: string, options: {
    filters?: string;
    sort?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{
    hits: any[];
    total: number;
    facets?: Record<string, any>;
  }> {
    if (!this.buildingsIndex) {
      // Try to ensure index exists before searching
      try {
        await this.ensureIndex();
      } catch (error) {
        this.logger.error(`Cannot search: Meilisearch index not available. Error: ${error}`);
        throw new Error('Meilisearch index not available');
      }
    }

    try {
      const result = await this.getBuildingsIndex().search(query || '', {
        filter: options.filters,
        sort: options.sort,
        limit: options.limit || 20,
        offset: options.offset || 0,
        attributesToHighlight: ['title', 'address', 'description'],
        showMatchesPosition: true,
      });

      return {
        hits: result.hits,
        total: result.estimatedTotalHits || result.totalHits || 0,
        facets: result.facetDistribution,
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw error;
    }
  }
}
