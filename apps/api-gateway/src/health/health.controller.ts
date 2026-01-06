import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { TcpHealthIndicator } from './tcp-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private tcp: TcpHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get('healthz/live')
  getLive() {
    // Liveness check - always returns OK if service is running
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('healthz/ready')
  @HealthCheck()
  getReady() {
    // Readiness check - validates all dependencies
    return this.health.check([
      () => this.checkPostgres(),
      () => this.checkRedis(),
      () => this.checkNATS(),
      () => this.checkMinIO(),
      () => this.checkMeilisearch(),
    ]);
  }

  @Get('health')
  @HealthCheck()
  getHealth() {
    // Main health endpoint - same as readiness
    return this.health.check([
      () => this.checkPostgres(),
      () => this.checkRedis(),
      () => this.checkNATS(),
      () => this.checkMinIO(),
      () => this.checkMeilisearch(),
    ]);
  }

  private checkPostgres() {
    const host = this.configService.get<string>('LISTINGS_DB_HOST', 'localhost');
    const port = this.configService.get<number>('LISTINGS_DB_PORT', 5432);
    return this.tcp.isHealthy('postgres', host, port, 1000);
  }

  private checkRedis() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    return this.tcp.isHealthy('redis', host, port, 1000);
  }

  private checkNATS() {
    const natsUrl = this.configService.get<string>('NATS_URL', 'nats://localhost:4222');
    // Extract host and port from NATS_URL (format: nats://host:port)
    let natsHost = 'localhost';
    let natsPort = 4222;
    
    try {
      // Ensure URL has protocol for parsing
      const urlStr = natsUrl.startsWith('nats://') ? natsUrl : `nats://${natsUrl}`;
      const url = new URL(urlStr);
      natsHost = url.hostname;
      natsPort = parseInt(url.port || '4222', 10);
    } catch (error) {
      // Fallback: try to parse as host:port
      const parts = natsUrl.replace(/^nats:\/\//, '').split(':');
      if (parts.length >= 2) {
        natsHost = parts[0];
        natsPort = parseInt(parts[1], 10) || 4222;
      }
    }
    
    return this.tcp.isHealthy('nats', natsHost, natsPort, 1000);
  }

  private checkMinIO() {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost:9000');
    const [host, port] = endpoint.split(':');
    const minioPort = parseInt(port || '9000', 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';
    return this.http.pingCheck(
      'minio',
      `${protocol}://${host}:${minioPort}/minio/health/live`,
      { timeout: 1500 },
    );
  }

  private checkMeilisearch() {
    const host = this.configService.get<string>('MEILISEARCH_HOST', 'http://localhost:7700');
    return this.http.pingCheck('meilisearch', `${host}/health`, { timeout: 1500 });
  }
}

