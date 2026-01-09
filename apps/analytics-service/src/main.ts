import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('ANALYTICS_SERVICE_PORT', 3005);

  await app.listen(port);
  console.log(`Analytics Service is running on: http://localhost:${port}`);
}
bootstrap();
