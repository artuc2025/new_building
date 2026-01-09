import { Controller, Get } from '@nestjs/common';
import { SwaggerDocument } from './swagger.service';
import { OpenAPIObject } from '@nestjs/swagger';

@Controller()
export class SwaggerController {
  constructor(private readonly swaggerService: SwaggerDocument) {}

  @Get('api-docs-json')
  getSwaggerJson(): OpenAPIObject {
    return this.swaggerService.getDocument();
  }
}

