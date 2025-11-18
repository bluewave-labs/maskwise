import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import * as crypto from 'crypto';

/**
 * API Key Authentication Guard
 *
 * NestJS guard that authenticates requests using API keys instead of JWT tokens.
 * Validates API key, checks expiration and user status, then attaches user to request.
 *
 * Alternative authentication method to JwtAuthGuard for:
 * - Programmatic API access (scripts, integrations)
 * - Long-lived credentials without refresh flow
 * - Server-to-server communication
 * - Webhook endpoints and callbacks
 *
 * @remarks
 * Authentication flow:
 * 1. Extract API key from Authorization header or query parameter
 * 2. Hash provided key for secure comparison
 * 3. Lookup API key in database by hash
 * 4. Validate key is active and not expired
 * 5. Validate associated user account is active
 * 6. Update last used timestamp (background)
 * 7. Attach user info to request for route handlers
 *
 * Security model:
 * - API keys stored as SHA-256 hashes (never plain text)
 * - Constant-time comparison via hash matching
 * - Key rotation supported via expiration dates
 * - User can have multiple keys for different integrations
 * - Keys can be individually revoked without affecting others
 *
 * Key extraction priority:
 * 1. Authorization header: "Bearer <api_key>" (preferred, secure)
 * 2. Query parameter: ?api_key=<api_key> (fallback, less secure)
 * 3. Query param useful for webhooks but discouraged for general use
 *
 * Validation checks:
 * - API key must exist in database
 * - API key must be active (not revoked)
 * - User account must be active
 * - Key must not be expired (if expiration set)
 * - All checks performed on every request
 *
 * Performance considerations:
 * - Database lookup on every request (similar to JWT strategy)
 * - SHA-256 hashing is fast (~1ms)
 * - Last used update is fire-and-forget (doesn't block request)
 * - Consider caching for high-traffic endpoints
 *
 * Comparison to JWT:
 * - API keys: simpler, long-lived, easier to revoke individually
 * - JWT: self-contained, short-lived, no database lookup for validation
 * - API keys better for integrations, JWT better for user sessions
 *
 * @example
 * ```typescript
 * // Protect route with API key
 * @Get('webhook')
 * @UseGuards(ApiKeyAuthGuard)
 * handleWebhook(@Request() req) {
 *   return req.user; // User from API key lookup
 * }
 *
 * // Allow either JWT or API key
 * @Get('data')
 * @UseGuards(ApiKeyAuthGuard) // Try API key first
 * @UseGuards(JwtAuthGuard)    // Fallback to JWT
 * getData() {
 *   return 'Accessible with either auth method';
 * }
 *
 * // Usage in client:
 * // curl -H "Authorization: Bearer msk_1234567890abcdef" /api/data
 * // OR
 * // curl "/api/data?api_key=msk_1234567890abcdef"
 * ```
 *
 * @see {@link ApiKeysService} for API key management
 * @see {@link JwtAuthGuard} for JWT-based authentication
 * @see {@link ApiKey} model for database schema
 *
 * @since 1.0.0
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  /**
   * Initializes API key guard with service
   *
   * @param apiKeysService - Service for API key lookup and management
   */
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(private apiKeysService: ApiKeysService) {}

  /**
   * Validates API key and authorizes request
   *
   * Called automatically by NestJS before route handler executes.
   * Throws UnauthorizedException if validation fails.
   *
   * @param context - Execution context containing request
   * @returns Promise resolving to true if authorized
   * @throws {UnauthorizedException} If API key missing, invalid, inactive, or expired
   *
   * @remarks
   * Validation sequence:
   * 1. Extract API key from request (header or query param)
   * 2. Hash key using SHA-256
   * 3. Database lookup by hash (secure comparison)
   * 4. Check key is active (not revoked)
   * 5. Check user account is active
   * 6. Check key not expired (if expiration set)
   * 7. Update last used timestamp asynchronously
   * 8. Populate req.user with account info
   *
   * Error handling:
   * - All validation failures return generic "Invalid API key"
   * - Prevents information leakage about key existence
   * - Errors during last used update are logged but don't block request
   * - Database errors caught and converted to 401 Unauthorized
   *
   * User population:
   * - Same structure as JWT authentication for consistency
   * - Contains: id, email, role, firstName, lastName
   * - Route handlers receive identical req.user regardless of auth method
   * - Enables switching between JWT and API key seamlessly
   *
   * Performance:
   * - SHA-256 hash: ~1ms
   * - Database lookup: ~10-50ms depending on load
   * - Last used update: non-blocking background operation
   * - Total overhead: ~11-51ms per request
   *
   * Security considerations:
   * - Keys hashed before database query (no plain text comparison)
   * - Generic error messages prevent enumeration
   * - Expiration checking prevents use of old keys
   * - User status checked on every request (immediate deactivation)
   *
   * @example
   * ```typescript
   * // Internal execution:
   * // 1. Request arrives with API key
   * // 2. canActivate() extracts and validates
   * // 3. If valid: req.user populated, returns true
   * // 4. If invalid: throws UnauthorizedException (401 response)
   * // 5. Route handler executes with req.user available
   * ```
   */
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
        this.logger.error('Failed to update API key last used', err.stack)
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

  /**
   * Extracts API key from request
   *
   * Checks Authorization header first (preferred), then falls back to query parameter.
   * Query parameter support needed for webhooks but discouraged for regular API use.
   *
   * @param request - HTTP request object
   * @returns API key string if found, null otherwise
   *
   * @remarks
   * Extraction priority:
   * 1. Authorization header: "Authorization: Bearer <api_key>"
   *    - Most secure (not logged in access logs)
   *    - Standard HTTP authentication method
   *    - Required for production use
   *
   * 2. Query parameter: ?api_key=<api_key>
   *    - Less secure (appears in logs and browser history)
   *    - Useful for webhooks and callbacks
   *    - Simple testing and debugging
   *    - Should be avoided for regular API calls
   *
   * Security implications:
   * - Header method: key not visible in URL logs
   * - Query param method: key visible in server logs, proxy logs, browser history
   * - Both methods support HTTPS encryption in transit
   * - Query param useful when headers can't be set (webhooks, embeds)
   *
   * @private
   * @example
   * ```typescript
   * // Header method (ONLY supported method):
   * // Authorization: Bearer msk_1234567890abcdef
   * // Returns: "msk_1234567890abcdef"
   * ```
   *
   * @remarks
   * SECURITY: Query parameter support has been removed because:
   * - API keys in URLs are logged in server access logs
   * - API keys appear in browser history
   * - API keys are visible in proxy logs
   * - API keys can leak via Referer headers
   * - API keys in URLs violate security best practices
   *
   * Clients MUST use the Authorization header to provide API keys.
   */
  private extractApiKey(request: any): string | null {
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Remove "Bearer " prefix
    }

    // SECURITY: Query parameter support removed - API keys must be in Authorization header
    return null;
  }
}