import { Module } from '@nestjs/common';
import { SwaggerController } from './swagger.controller';
import { SwaggerDocument } from './swagger.service';

@Module({
  controllers: [SwaggerController],
  providers: [SwaggerDocument],
  exports: [SwaggerDocument],
})
export class SwaggerModule {}

