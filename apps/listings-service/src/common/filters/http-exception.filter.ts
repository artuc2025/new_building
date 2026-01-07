import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { randomUUID } from 'crypto';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    requestId: string;
    statusCode: number;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Bypass error handling for health endpoints
    if (request.url?.startsWith('/health') || request.url?.startsWith('/healthz')) {
      // Let health endpoints handle their own responses
      if (exception instanceof HttpException) {
        return response.status(exception.getStatus()).json(exception.getResponse());
      }
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error',
      });
    }

    // Get or generate request ID
    const requestId = (request.headers['x-request-id'] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.getErrorCodeFromStatus(status);
        // For NotFoundException, extract ID if possible
        if (status === HttpStatus.NOT_FOUND && message.includes('not found')) {
          code = 'NOT_FOUND';
          const match = message.match(/with ID ['"]?([^'"]+)['"]?/);
          if (match) {
            details = { id: match[1] };
          }
        }
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        
        // Extract error code if provided
        if (responseObj.code) {
          code = responseObj.code;
        } else {
          // Generate code from status
          code = this.getErrorCodeFromStatus(status);
        }
        
        // Extract details
        details = responseObj.details;
        
        // Handle validation errors
        if (Array.isArray(message)) {
          details = {
            fields: message.map((msg: any) => {
              if (typeof msg === 'string') {
                return { message: msg };
              }
              return msg;
            }),
          };
          message = 'Request validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = 'INTERNAL_ERROR';
    }

    // Never return 500 for validation errors
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && code === 'VALIDATION_ERROR') {
      status = HttpStatus.BAD_REQUEST;
    }

    // Map 5xx to 503 for upstream errors (shouldn't happen in listings-service, but safety)
    if (status >= 500 && status < 600) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'SERVICE_UNAVAILABLE';
    }

    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
        details,
        requestId,
        statusCode: status,
      },
    };

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
