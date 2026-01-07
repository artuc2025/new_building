import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingsModule } from './buildings/buildings.module';
import { AppDataSource } from './data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL || process.env.DATABASE_URL_LISTINGS || 'postgresql://postgres:postgres@localhost:5432/new_building_portal',
        schema: 'listings',
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        migrationsRun: false,
      }),
    }),
    BuildingsModule,
  ],
})
export class AppModule {}

