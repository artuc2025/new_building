import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import * as net from 'net';

@Injectable()
export class TcpHealthIndicator extends HealthIndicator {
  async isHealthy(key: string, host: string, port: number, timeout: number = 1000): Promise<HealthIndicatorResult> {
    const isHealthy = await this.checkTcpConnection(host, port, timeout);
    const result = this.getStatus(key, isHealthy, {
      host,
      port,
    });

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError(`${key} is not available`, result);
  }

  private checkTcpConnection(host: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      const onConnect = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(true);
        }
      };

      const onError = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(false);
        }
      };

      const onTimeout = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(false);
        }
      };

      socket.setTimeout(timeout);
      socket.once('connect', onConnect);
      socket.once('error', onError);
      socket.once('timeout', onTimeout);

      socket.connect(port, host);
    });
  }
}

