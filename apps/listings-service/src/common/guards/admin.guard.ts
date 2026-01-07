import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminToken = request.headers['x-admin-token'];
    const expectedToken = this.configService.get<string>('ADMIN_TOKEN');

    if (!expectedToken) {
      throw new UnauthorizedException('Admin authentication not configured');
    }

    if (!adminToken || adminToken !== expectedToken) {
      throw new UnauthorizedException('Invalid or missing admin token');
    }

    return true;
  }
}

