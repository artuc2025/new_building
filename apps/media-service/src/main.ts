import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('MEDIA_SERVICE_PORT', 3003);
  const apiPrefix = configService.get<string>('API_PREFIX', '');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
        exposeDefaultValues: true,
      },
    }),
  );

  // API prefix
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  await app.listen(port);
  console.log(`Media Service is running on: http://localhost:${port}`);
}
bootstrap();
