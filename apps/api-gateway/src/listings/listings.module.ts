import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ListingsController } from './listings.controller';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 seconds default
      maxRedirects: 5,
    }),
  ],
  controllers: [ListingsController],
  providers: [AdminGuard],
})
export class ListingsModule {}

