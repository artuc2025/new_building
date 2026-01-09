import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { Building } from '../entities/building.entity';
import { PricingSnapshot } from '../entities/pricing-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Building, PricingSnapshot])],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}

