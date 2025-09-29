import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';

/**
 * Refresh JWT Authentication Strategy
 *
 * Passport.js strategy for validating JWT refresh tokens when requesting new access tokens.
 * Uses separate secret from access tokens and validates user is still active before issuing
 * new token pair.
 *
 * This strategy is automatically applied to routes protected with @UseGuards(JwtRefreshGuard),
 * specifically the token refresh endpoint.
 *
 * @remarks
 * Token extraction:
 * - Expects "Authorization: Bearer <refresh_token>" header format
 * - Token signature verified using JWT_REFRESH_SECRET (or JWT_SECRET as fallback)
 * - Expired tokens automatically rejected (ignoreExpiration: false)
 * - Expiration set to 7 days at token generation
 *
 * Validation process:
 * 1. Extract refresh token from Authorization header
 * 2. Verify token signature using JWT_REFRESH_SECRET
 * 3. Check token not expired (7 day window)
 * 4. Lookup user by ID from token payload
 * 5. Verify user exists and is active
 * 6. Attach user object to request for controller
 *
 * Security:
 * - Separate secret from access tokens recommended (defense in depth)
 * - Falls back to JWT_SECRET if REFRESH_SECRET not configured
 * - Inactive users cannot refresh tokens
 * - Deleted users' tokens become invalid immediately
 * - Token rotation strategy prevents replay attacks
 *
 * Token rotation:
 * - Each refresh generates new access AND refresh token
 * - Old refresh token should be discarded by client
 * - Prevents stolen tokens from being reused indefinitely
 *
 * Performance:
 * - Database lookup on every refresh request
 * - Less frequent than access token validation (every ~15 minutes vs every request)
 * - Caching not recommended due to security implications
 *
 * @example
 * ```typescript
 * // In auth controller:
 * @Post('refresh')
 * @UseGuards(JwtRefreshGuard)
 * refreshTokens(@Request() req) {
 *   // req.user populated by this strategy
 *   return this.authService.refreshTokens(req.user);
 * }
 * ```
 *
 * @see {@link JwtRefreshGuard} for guard implementation
 * @see {@link AuthService.refreshTokens} for token refresh logic
 * @see {@link AuthService.generateRefreshToken} for token generation
 * @see {@link JwtPayload} for token structure
 *
 * @since 1.0.0
 */
@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  /**
   * Initializes refresh JWT strategy with configuration
   *
   * @param configService - NestJS config service for accessing JWT_REFRESH_SECRET
   * @param usersService - Users service for user lookup during validation
   *
   * @remarks
   * Strategy name 'jwt-refresh' distinguishes this from default 'jwt' strategy.
   * This allows both strategies to coexist and be used on different routes.
   */
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService?.get<string>('JWT_REFRESH_SECRET') || configService?.get<string>('JWT_SECRET') || process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-refresh-secret',
    });
  }

  /**
   * Validates refresh token payload and returns user information
   *
   * Called automatically by Passport.js after token signature is verified.
   * Ensures user still exists and is active before allowing token refresh.
   *
   * @param payload - Decoded JWT payload containing user identification
   * @returns User object to attach to request (available as req.user)
   * @throws {UnauthorizedException} If user not found or account deactivated
   *
   * @remarks
   * Return value becomes req.user in refresh endpoint:
   * - id: User's unique identifier for token generation
   * - email: User's email for new token payload
   * - role: User's role for new token payload
   *
   * Minimal user data returned (no firstName/lastName) since controller
   * will generate new tokens immediately without needing additional fields.
   *
   * Security considerations:
   * - User lookup ensures tokens for deleted users are invalid
   * - isActive check prevents deactivated accounts from refreshing
   * - Refresh tokens become invalid immediately when user deactivated
   * - No grace period for refresh - strict enforcement
   *
   * Performance:
   * - Runs only on refresh requests (~every 15 minutes per user)
   * - Much less frequent than access token validation
   * - Database query acceptable for this frequency
   *
   * @example
   * ```typescript
   * // In refresh endpoint:
   * @Post('refresh')
   * @UseGuards(JwtRefreshGuard)
   * async refresh(@Request() req) {
   *   // req.user contains: { id, email, role }
   *   return this.authService.refreshTokens(req.user.id);
   * }
   * ```
   */
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}