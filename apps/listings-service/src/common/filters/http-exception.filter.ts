import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  details?: any;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: string | undefined;
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error;
        details = responseObj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = 'Internal Server Error';
    }

    // Never return 500 for validation errors - ensure they're 400
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && Array.isArray(message)) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Don't leak stack traces in production
    if (process.env.NODE_ENV === 'development' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.details = exception instanceof Error ? exception.stack : undefined;
    }

    response.status(status).json(errorResponse);
  }
}

