import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

  await app.listen(port);
  console.log(`API Gateway is running on: http://localhost:${port}`);
}

bootstrap();

