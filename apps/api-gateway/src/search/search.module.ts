import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SearchController } from './search.controller';

@Module({
  imports: [HttpModule],
  controllers: [SearchController],
})
export class SearchModule {}
