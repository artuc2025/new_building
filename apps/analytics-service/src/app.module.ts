import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './data-source';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const host = process.env.ANALYTICS_DB_HOST || 'localhost';
        const port = parseInt(process.env.ANALYTICS_DB_PORT || '5432', 10);
        const username = process.env.ANALYTICS_DB_USER || 'postgres';
        const password = process.env.ANALYTICS_DB_PASSWORD || 'postgres';
        const database = process.env.ANALYTICS_DB_NAME || 'new_building_portal';

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          schema: 'analytics',
          synchronize: false,
          logging: process.env.NODE_ENV === 'development',
          entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsTableName: 'typeorm_migrations',
          migrationsRun: false,
        };
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
