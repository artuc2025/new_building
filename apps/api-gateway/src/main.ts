import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerDocument } from './swagger/swagger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // Get environment variables with defaults
  const listingsServiceUrl = configService.get<string>('LISTINGS_SERVICE_URL', 'http://localhost:3001');
  
  const port = configService.get<number>('API_GATEWAY_PORT', 3000);
  const corsOrigin = configService.get<string>('API_GATEWAY_CORS_ORIGIN', 'http://localhost:3006');

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

  // CORS configuration - support multiple origins for development
  const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());
  const isDevelopment = configService.get<string>('NODE_ENV', 'development') === 'development';

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.) in development
      if (!origin && isDevelopment) {
        return callback(null, true);
      }

      // In development, allow all localhost origins for easier debugging
      if (isDevelopment && origin && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
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
  // extraModels removed - models are discovered via @ApiExtraModels decorators on controllers
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Store document in service for /api-docs-json endpoint
  const swaggerDocumentService = app.get(SwaggerDocument);
  swaggerDocumentService.setDocument(document);

  await app.listen(port);
  console.log(`API Gateway is running on: http://localhost:${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/api-docs`);
  console.log(`Swagger JSON available at: http://localhost:${port}/api-docs-json`);
}

bootstrap();

