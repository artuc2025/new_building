import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './services/search.service';
import { MeilisearchService } from './services/meilisearch.service';
import { SearchSyncService } from './services/search-sync.service';
import {
  BuildingLocation,
  SearchAnalytics,
  IndexSyncStatus,
  Inbox,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const host = process.env.SEARCH_DB_HOST || process.env.LISTINGS_DB_HOST || 'localhost';
        const port = parseInt(process.env.SEARCH_DB_PORT || process.env.LISTINGS_DB_PORT || '5432', 10);
        const username = process.env.SEARCH_DB_USER || process.env.LISTINGS_DB_USER || 'postgres';
        const password = process.env.SEARCH_DB_PASSWORD || process.env.LISTINGS_DB_PASSWORD || 'postgres';
        const database = process.env.SEARCH_DB_NAME || process.env.LISTINGS_DB_NAME || 'new_building_portal';

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          schema: 'search',
          synchronize: false,
          logging: process.env.NODE_ENV === 'development',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsTableName: 'typeorm_migrations',
          migrationsRun: false,
        };
      },
    }),
    TypeOrmModule.forFeature([BuildingLocation, SearchAnalytics, IndexSyncStatus, Inbox]),
  ],
  controllers: [SearchController],
  providers: [SearchService, MeilisearchService, SearchSyncService],
})
export class SearchModule {}
