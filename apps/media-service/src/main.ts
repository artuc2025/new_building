import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('MEDIA_SERVICE_PORT', 3003);

  await app.listen(port);
  console.log(`Media Service is running on: http://localhost:${port}`);
}
bootstrap();
