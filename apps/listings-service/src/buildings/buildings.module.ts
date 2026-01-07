import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingsController, AdminBuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { Building } from '../entities/building.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Building])],
  controllers: [BuildingsController, AdminBuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}

