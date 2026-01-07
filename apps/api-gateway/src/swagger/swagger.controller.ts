import { Controller, Get } from '@nestjs/common';
import { SwaggerDocument } from './swagger.service';

@Controller()
export class SwaggerController {
  constructor(private readonly swaggerService: SwaggerDocument) {}

  @Get('api-docs-json')
  getSwaggerJson() {
    return this.swaggerService.getDocument();
  }
}

