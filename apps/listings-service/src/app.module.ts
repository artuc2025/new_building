import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingsModule } from './buildings/buildings.module';
import { AppDataSource } from './data-source';
import { SwaggerModule } from './swagger/swagger.module';

// During OpenAPI generation, prevent TypeORM from actually connecting
const skipDatabaseConnection = process.env.SKIP_DB_CONNECTION === 'true' || process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const host = process.env.LISTINGS_DB_HOST || 'localhost';
        const port = parseInt(process.env.LISTINGS_DB_PORT || '5432', 10);
        const username = process.env.LISTINGS_DB_USER || 'postgres';
        const password = process.env.LISTINGS_DB_PASSWORD || 'postgres';
        const database = process.env.LISTINGS_DB_NAME || 'new_building_portal';

        const config: any = {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          schema: 'listings',
          synchronize: false,
          logging: process.env.NODE_ENV === 'development',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsTableName: 'typeorm_migrations',
          migrationsRun: false,
        };
        
        // During OpenAPI generation, prevent connection attempts
        if (skipDatabaseConnection) {
          // Set retry attempts to 0 to fail immediately
          config.retryAttempts = 0;
          config.retryDelay = 0;
          // Set a very short timeout to fail quickly (1ms)
          const timeout = parseInt(process.env.DB_CONNECTION_TIMEOUT || '1', 10);
          config.connectTimeoutMS = timeout;
          config.extra = {
            connectionTimeoutMillis: timeout,
            query_timeout: timeout,
          };
          // Use autoLoadEntities: false to prevent eager connection
          config.autoLoadEntities = false;
          // Set connection to be lazy - don't connect until first use
          // Note: This doesn't prevent connection, but helps with timing
        }
        
        return config;
      },
    }),
    BuildingsModule,
    SwaggerModule,
  ],
})
export class AppModule {}

