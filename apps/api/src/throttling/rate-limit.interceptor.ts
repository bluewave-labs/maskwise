import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Rate Limit Interceptor
 * 
 * Adds rate limiting headers and monitoring to all responses.
 * Provides additional rate limiting logic beyond the basic throttling.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly windowMs = 60 * 1000; // 1 minute window

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        this.addRateLimitHeaders(request, response);
        this.logRequest(request, Date.now() - startTime);
      })
    );
  }

  /**
   * Add rate limiting headers to response
   */
  private addRateLimitHeaders(request: Request, response: Response): void {
    const identifier = this.getIdentifier(request);
    const limits = this.getCurrentLimits(request);
    const usage = this.getUsageInfo(identifier);

    response.setHeader('X-RateLimit-Limit', limits.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, limits.limit - usage.count));
    response.setHeader('X-RateLimit-Reset', Math.ceil(usage.resetTime / 1000));
    response.setHeader('X-RateLimit-Window', this.windowMs / 1000);

    // Add additional headers for API monitoring
    const user = request.user as any;
    if (user?.role) {
      response.setHeader('X-RateLimit-User-Type', user.role.toLowerCase());
    }

    if (this.isApiKeyRequest(request)) {
      response.setHeader('X-RateLimit-Auth-Type', 'api-key');
    } else if (user) {
      response.setHeader('X-RateLimit-Auth-Type', 'jwt');
    } else {
      response.setHeader('X-RateLimit-Auth-Type', 'anonymous');
    }
  }

  /**
   * Get identifier for rate limiting
   */
  private getIdentifier(request: Request): string {
    const user = request.user as any;
    
    if (user?.id) {
      return `user:${user.id}`;
    }

    if (this.isApiKeyRequest(request)) {
      const authHeader = request.headers.authorization;
      const apiKey = authHeader?.substring(7, 27); // First 20 chars
      return `apikey:${apiKey}`;
    }

    const forwarded = request.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.connection.remoteAddress;
    return `ip:${ip}`;
  }

  /**
   * Get current rate limits for request
   */
  private getCurrentLimits(request: Request): { limit: number; window: number } {
    const user = request.user as any;
    const path = request.url;

    // Admin users
    if (user?.role === 'ADMIN') {
      if (path.includes('/v1/')) return { limit: 500, window: this.windowMs };
      return { limit: 200, window: this.windowMs };
    }

    // Regular authenticated users
    if (user) {
      if (path.includes('/v1/')) return { limit: 200, window: this.windowMs };
      return { limit: 100, window: this.windowMs };
    }

    // API key users
    if (this.isApiKeyRequest(request)) {
      if (path.includes('/v1/')) return { limit: 1000, window: this.windowMs };
      return { limit: 150, window: this.windowMs };
    }

    // Anonymous users - very restrictive
    if (path.includes('/auth/')) return { limit: 5, window: this.windowMs };
    if (path.includes('/v1/')) return { limit: 10, window: this.windowMs };
    return { limit: 30, window: this.windowMs };
  }

  /**
   * Get usage information for identifier
   */
  private getUsageInfo(identifier: string): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.requestCounts.get(identifier);

    if (!existing || now >= existing.resetTime) {
      const usage = { count: 1, resetTime: now + this.windowMs };
      this.requestCounts.set(identifier, usage);
      return usage;
    }

    existing.count += 1;
    return existing;
  }

  /**
   * Check if request uses API key
   */
  private isApiKeyRequest(request: Request): boolean {
    const authHeader = request.headers.authorization;
    return authHeader?.startsWith('Bearer mk_live_') || false;
  }

  /**
   * Log request for monitoring
   */
  private logRequest(request: Request, duration: number): void {
    const identifier = this.getIdentifier(request);
    const usage = this.requestCounts.get(identifier);
    const limits = this.getCurrentLimits(request);

    // Log high usage or slow requests
    if (usage && (usage.count > limits.limit * 0.8 || duration > 1000)) {
      console.log(`[Rate Limit Monitor] ${request.method} ${request.url}`, {
        identifier,
        usage: usage.count,
        limit: limits.limit,
        remaining: limits.limit - usage.count,
        duration: `${duration}ms`,
        userAgent: request.headers['user-agent'],
      });
    }
  }

  /**
   * Clean up old entries periodically
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCounts.entries()) {
      if (now >= value.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}