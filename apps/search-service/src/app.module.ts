import { Module } from '@nestjs/common';
import { SearchModule } from './search.module';

@Module({
  imports: [SearchModule],
})
export class AppModule {}
