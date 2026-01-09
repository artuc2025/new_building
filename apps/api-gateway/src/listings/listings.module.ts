import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ListingsController } from './listings.controller';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('LISTINGS_SERVICE_TIMEOUT', 10000), // 10 seconds default
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ListingsController],
  providers: [AdminGuard],
})
export class ListingsModule {}

