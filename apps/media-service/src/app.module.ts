import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaController } from './controllers/media.controller';
import { StorageService, ImageProcessorService, EventService, MediaService } from './services';
import { Asset, ProcessingJob } from './entities';
import { configValidationSchema } from './config/config.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const host = process.env.MEDIA_DB_HOST || 'localhost';
        const port = parseInt(process.env.MEDIA_DB_PORT || '5432', 10);
        const username = process.env.MEDIA_DB_USER || 'postgres';
        const password = process.env.MEDIA_DB_PASSWORD || 'postgres';
        const database = process.env.MEDIA_DB_NAME || 'new_building_portal';

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          schema: 'media',
          synchronize: false,
          logging: process.env.NODE_ENV === 'development',
          entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsTableName: 'typeorm_migrations',
          migrationsRun: false,
        };
      },
    }),
    TypeOrmModule.forFeature([Asset, ProcessingJob]),
  ],
  controllers: [MediaController],
  providers: [StorageService, ImageProcessorService, EventService, MediaService],
})
export class AppModule {}
