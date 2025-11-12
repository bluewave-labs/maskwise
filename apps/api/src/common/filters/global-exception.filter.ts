import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  correlationId: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = this.generateCorrelationId();
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    let statusCode: number;
    let message: string | string[];
    let error: string;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Database-specific errors
      statusCode = this.handlePrismaError(exception);
      message = this.getPrismaErrorMessage(exception);
      error = 'Database Error';
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      error = 'Validation Error';
    } else if (exception instanceof ThrottlerException) {
      // Rate limiting errors
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Too many requests. Please try again later.';
      error = 'Rate Limit Exceeded';
    } else if (exception instanceof TokenExpiredError) {
      // JWT token expired
      statusCode = HttpStatus.UNAUTHORIZED;
      message = 'Token has expired. Please login again.';
      error = 'Token Expired';
    } else if (exception instanceof JsonWebTokenError) {
      // JWT token invalid
      statusCode = HttpStatus.UNAUTHORIZED;
      message = 'Invalid token. Please login again.';
      error = 'Invalid Token';
    } else if (exception instanceof TypeError && exception.message.includes('fetch')) {
      // Network/External service errors
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'External service temporarily unavailable. Please try again later.';
      error = 'Service Unavailable';
    } else {
      // Unknown/Unhandled errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred. Please try again later.';
      error = 'Internal Server Error';
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      timestamp,
      path,
      method,
      message,
      error,
      correlationId,
    };

    // Log error details for debugging (but not sensitive information)
    this.logError(exception, request, errorResponse);

    // Don't include error details in production for security
    if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
      delete errorResponse.error;
      errorResponse.message = 'An unexpected error occurred. Please try again later.';
    }

    response.status(statusCode).json(errorResponse);
  }

  private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError): number {
    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        return HttpStatus.CONFLICT;
      case 'P2025': // Record not found
        return HttpStatus.NOT_FOUND;
      case 'P2003': // Foreign key constraint violation
        return HttpStatus.BAD_REQUEST;
      case 'P2014': // Invalid ID
        return HttpStatus.BAD_REQUEST;
      case 'P2015': // Related record not found
        return HttpStatus.NOT_FOUND;
      case 'P2021': // Table does not exist
        return HttpStatus.INTERNAL_SERVER_ERROR;
      case 'P2022': // Column does not exist
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getPrismaErrorMessage(exception: Prisma.PrismaClientKnownRequestError): string {
    const isProduction = process.env.NODE_ENV === 'production';

    switch (exception.code) {
      case 'P2002':
        // SECURITY: In production, don't expose field names that might reveal schema
        if (isProduction) {
          return 'A record with these values already exists.';
        }
        const target = (exception.meta?.target as string[]) || [];
        return `A record with this ${target.join(', ')} already exists.`;
      case 'P2025':
        return 'The requested record was not found.';
      case 'P2003':
        // SECURITY: In production, don't expose relationship details
        if (isProduction) {
          return 'Cannot complete this operation.';
        }
        return 'Cannot complete this operation due to related records.';
      case 'P2014':
        return 'The provided ID is invalid.';
      case 'P2015':
        return 'A required related record was not found.';
      default:
        return 'A database error occurred. Please try again later.';
    }
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ) {
    const { statusCode, correlationId, path, method } = errorResponse;
    const user = (request as any).user;
    const userId = user?.id || 'anonymous';

    // Create structured log entry
    const logContext = {
      correlationId,
      userId,
      method,
      path,
      statusCode,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
    };

    if (statusCode >= 500) {
      // Log full error details for server errors
      this.logger.error(
        `Internal Server Error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        {
          ...logContext,
          stack: exception instanceof Error ? exception.stack : undefined,
          exception: exception instanceof Error ? exception.name : typeof exception,
        },
      );
    } else if (statusCode >= 400) {
      // Log client errors with less detail
      this.logger.warn(
        `Client Error: ${errorResponse.message}`,
        logContext,
      );
    }
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}