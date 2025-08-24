import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    try {
      // Hash the provided key to compare with stored hash
      const keyHash = ApiKeysService.hashApiKey(apiKey);
      
      // Find the API key in database
      const apiKeyData = await this.apiKeysService.findApiKeyByHash(keyHash);

      if (!apiKeyData) {
        throw new UnauthorizedException('Invalid API key');
      }

      if (!apiKeyData.isActive) {
        throw new UnauthorizedException('API key is inactive');
      }

      if (!apiKeyData.user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      if (apiKeyData.expiresAt && new Date() > apiKeyData.expiresAt) {
        throw new UnauthorizedException('API key has expired');
      }

      // Update last used timestamp (fire and forget)
      this.apiKeysService.updateLastUsed(apiKeyData.id).catch(err => 
        console.error('Failed to update API key last used:', err)
      );

      // Attach user info to request for use in controllers
      request.user = {
        id: apiKeyData.user.id,
        email: apiKeyData.user.email,
        role: apiKeyData.user.role,
        firstName: apiKeyData.user.firstName,
        lastName: apiKeyData.user.lastName,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private extractApiKey(request: any): string | null {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Remove "Bearer " prefix
    }
    
    // Also check for API key in query params (less secure, but sometimes needed)
    return request.query.api_key || null;
  }
}