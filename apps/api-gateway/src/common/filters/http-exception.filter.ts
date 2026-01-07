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
    if (request.url?.startsWith('/healthz') || request.url?.startsWith('/health')) {
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
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        
        // Check if it's already in README error format (from upstream service)
        if (responseObj.error && typeof responseObj.error === 'object') {
          const errorObj = responseObj.error;
          // Preserve requestId from upstream if present, otherwise use ours
          const upstreamRequestId = errorObj.requestId || requestId;
          // Forward upstream error format as-is
          return response.status(status).json({
            error: {
              ...errorObj,
              requestId: upstreamRequestId,
            },
          });
        } else {
          message = responseObj.message || message;
          code = responseObj.code || this.getErrorCodeFromStatus(status);
          details = responseObj.details;
        }
        
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

    // Map upstream 5xx to 503 Service Unavailable (per README)
    if (status >= 500 && status < 600) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'SERVICE_UNAVAILABLE';
      message = 'Service temporarily unavailable';
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
