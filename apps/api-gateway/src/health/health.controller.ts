import { Controller, Get } from '@nestjs/common';

const startTime = Date.now();

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
    };
  }

  @Get('ready')
  getReady() {
    return {
      status: 'ready',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  getLive() {
    return {
      status: 'live',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }
}

