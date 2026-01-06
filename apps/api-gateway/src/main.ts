import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_GATEWAY_PORT', 3000);
  const corsOrigin = configService.get<string>('API_GATEWAY_CORS_ORIGIN', 'http://localhost:3001');

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(port);
  console.log(`API Gateway is running on: http://localhost:${port}`);
}

bootstrap();

