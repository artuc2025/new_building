import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health/health.controller';
import { TcpHealthIndicator } from './health/tcp-health.indicator';
import { ListingsModule } from './listings/listings.module';
import { SwaggerModule } from './swagger/swagger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TerminusModule,
    HttpModule,
    ListingsModule,
    SwaggerModule,
  ],
  controllers: [HealthController],
  providers: [TcpHealthIndicator],
})
export class AppModule {}

