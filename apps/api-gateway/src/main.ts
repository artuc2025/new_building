import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_GATEWAY_PORT', 3000);
  const corsOrigin = configService.get<string>('API_GATEWAY_CORS_ORIGIN', 'http://localhost:3001');

  // Global validation pipe (for gateway-level validation if needed)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow pass-through to services
      transform: true,
    }),
  );

  // Global exception filter for error normalization
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // OpenAPI/Swagger setup
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('API Gateway for New Building Portal')
    .setVersion('1.0')
    .addTag('buildings', 'Public building endpoints')
    .addTag('admin-buildings', 'Admin building endpoints')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-admin-key',
        in: 'header',
        description: 'Admin API key for admin endpoints',
      },
      'admin-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  
  // Swagger UI at /api/docs (required by Sprint 2 DoD)
  SwaggerModule.setup('api/docs', app, document);
  
  // Compatibility: /api-docs redirects to /api/docs
  app.getHttpAdapter().get('/api-docs', (req, res) => {
    res.redirect('/api/docs');
  });
  
  // JSON spec endpoint at /api-docs-json
  app.getHttpAdapter().get('/api-docs-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  await app.listen(port);
  console.log(`API Gateway is running on: http://localhost:${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/api/docs`);
}

bootstrap();

