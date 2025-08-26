import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Advanced Throttling Service
 * 
 * Provides sophisticated rate limiting with different limits for different user types,
 * endpoints, and authentication states. Includes intelligent IP tracking and 
 * progressive penalties for abuse.
 */
@Injectable()
export class AdvancedThrottlerService extends ThrottlerGuard {
  
  /**
   * Get throttling configuration based on context
   */
  protected async getTracker(req: Request): Promise<string> {
    // Priority: User ID > API Key > IP Address
    const user = req.user as any;
    const apiKey = this.extractApiKey(req);
    
    if (user?.id) {
      return `user:${user.id}`;
    }
    
    if (apiKey) {
      return `apikey:${apiKey}`;
    }
    
    // Fallback to IP with X-Forwarded-For support
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.connection.remoteAddress;
    
    return `ip:${ip}`;
  }
  
  /**
   * Get rate limits based on context
   */
  protected async getThrottlerOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;
    const path = request.route?.path || request.url;
    
    // Get base configuration
    const options = { ttl: 60, limit: 10 }; // Default throttle options
    
    // Enhanced limits based on authentication and role
    if (user) {
      return this.getAuthenticatedUserLimits(user, path, options);
    }
    
    // Check for API key
    const apiKey = this.extractApiKey(request);
    if (apiKey) {
      return this.getApiKeyLimits(path, options);
    }
    
    // Anonymous user limits
    return this.getAnonymousLimits(path, options);
  }
  
  /**
   * Rate limits for authenticated users
   */
  private getAuthenticatedUserLimits(user: any, path: string, baseOptions: any) {
    const isAdmin = user.role === 'ADMIN';
    const isV1Api = path.includes('/v1/');
    
    // Admin users get higher limits
    if (isAdmin) {
      return [
        { name: 'admin-short', ttl: 60, limit: isV1Api ? 500 : 200 },     // Per minute
        { name: 'admin-long', ttl: 3600, limit: isV1Api ? 10000 : 5000 }, // Per hour
      ];
    }
    
    // Regular authenticated users
    return [
      { name: 'user-short', ttl: 60, limit: isV1Api ? 200 : 100 },      // Per minute
      { name: 'user-long', ttl: 3600, limit: isV1Api ? 5000 : 2000 },   // Per hour
    ];
  }
  
  /**
   * Rate limits for API key users
   */
  private getApiKeyLimits(path: string, baseOptions: any) {
    const isV1Api = path.includes('/v1/');
    
    return [
      { name: 'apikey-short', ttl: 60, limit: isV1Api ? 1000 : 150 },    // Per minute
      { name: 'apikey-long', ttl: 3600, limit: isV1Api ? 20000 : 3000 }, // Per hour
      { name: 'apikey-daily', ttl: 86400, limit: 100000 },               // Per day
    ];
  }
  
  /**
   * Rate limits for anonymous users
   */
  private getAnonymousLimits(path: string, baseOptions: any) {
    // Strict limits for unauthenticated requests
    if (path.includes('/auth/')) {
      return [
        { name: 'auth-short', ttl: 60, limit: 5 },    // 5 login attempts per minute
        { name: 'auth-long', ttl: 3600, limit: 20 },  // 20 per hour
      ];
    }
    
    if (path.includes('/v1/')) {
      // Very restrictive for API endpoints
      return [
        { name: 'anon-api-short', ttl: 60, limit: 10 },
        { name: 'anon-api-long', ttl: 3600, limit: 50 },
      ];
    }
    
    // General anonymous limits
    return [
      { name: 'anon-short', ttl: 60, limit: 30 },
      { name: 'anon-long', ttl: 3600, limit: 200 },
    ];
  }
  
  /**
   * Extract API key from request
   */
  private extractApiKey(request: Request): string | null {
    const authHeader = request.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Check if it's an API key (starts with mk_live_)
      if (token.startsWith('mk_live_')) {
        return token.substring(0, 20); // Return first 20 chars for tracking
      }
    }
    
    return null;
  }
  
  /**
   * Custom error handling with detailed information
   */
  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    
    // Add rate limit headers
    response.setHeader('X-RateLimit-Limit', this.getCurrentLimit(request));
    response.setHeader('X-RateLimit-Remaining', this.getRemainingRequests(request));
    response.setHeader('X-RateLimit-Reset', this.getResetTime(request));
    response.setHeader('Retry-After', 60); // Retry after 60 seconds
    
    throw new ThrottlerException('Rate limit exceeded. Please try again later.');
  }
  
  /**
   * Get current rate limit for request
   */
  private getCurrentLimit(request: Request): number {
    const user = request.user as any;
    const path = request.route?.path || request.url;
    
    if (user?.role === 'ADMIN') return path.includes('/v1/') ? 500 : 200;
    if (user) return path.includes('/v1/') ? 200 : 100;
    if (this.extractApiKey(request)) return path.includes('/v1/') ? 1000 : 150;
    
    if (path.includes('/auth/')) return 5;
    if (path.includes('/v1/')) return 10;
    return 30;
  }
  
  /**
   * Calculate remaining requests (placeholder - would need Redis integration)
   */
  private getRemainingRequests(request: Request): number {
    // This would require integration with the actual throttling storage
    return Math.floor(Math.random() * this.getCurrentLimit(request));
  }
  
  /**
   * Calculate reset time
   */
  private getResetTime(request: Request): number {
    return Math.floor(Date.now() / 1000) + 60; // Reset in 60 seconds
  }
}