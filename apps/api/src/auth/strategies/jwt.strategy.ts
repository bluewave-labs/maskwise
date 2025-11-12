import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';

/**
 * JWT Authentication Strategy
 *
 * Passport.js strategy for validating JWT access tokens in API requests.
 * Extracts and verifies tokens from Authorization header, validates user exists
 * and is active, then attaches user information to request object.
 *
 * This strategy is automatically applied to routes protected with @UseGuards(JwtAuthGuard).
 *
 * @remarks
 * Token extraction:
 * - Expects "Authorization: Bearer <token>" header format
 * - Token signature verified using JWT_SECRET
 * - Expired tokens automatically rejected (ignoreExpiration: false)
 *
 * Validation process:
 * 1. Extract token from Authorization header
 * 2. Verify token signature and expiration
 * 3. Lookup user by ID from token payload
 * 4. Verify user exists and is active
 * 5. Attach user object to request for route handlers
 *
 * Security:
 * - Inactive users cannot authenticate even with valid token
 * - Missing users treated as unauthorized
 * - Token expiration strictly enforced (15 minutes)
 * - Fallback secret for development only (should never be used in production)
 *
 * Performance:
 * - Database lookup on every authenticated request
 * - Consider caching user data for high-traffic scenarios
 *
 * @see {@link JwtAuthGuard} for guard implementation
 * @see {@link AuthService.generateAccessToken} for token generation
 * @see {@link JwtPayload} for token structure
 *
 * @since 1.0.0
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Initializes JWT strategy with configuration
   *
   * @param configService - NestJS config service for accessing JWT_SECRET
   * @param usersService - Users service for user lookup during validation
   */
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const jwtSecret = configService?.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_SECRET is not configured. ' +
        'Application cannot start without a secure JWT secret. ' +
        'Please set JWT_SECRET environment variable with a strong secret (minimum 32 characters).'
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Validates JWT payload and returns user information
   *
   * Called automatically by Passport.js after token signature is verified.
   * Ensures user still exists and is active before allowing request to proceed.
   *
   * @param payload - Decoded JWT payload containing user identification
   * @returns User object to attach to request (available as req.user)
   * @throws {UnauthorizedException} If user not found or account deactivated
   *
   * @remarks
   * Return value becomes req.user in route handlers:
   * - id: User's unique identifier
   * - email: User's email address
   * - role: User's role for authorization (ADMIN, USER, etc.)
   * - firstName/lastName: User's name for display
   *
   * Security considerations:
   * - User lookup ensures tokens for deleted users are invalid
   * - isActive check prevents deactivated accounts from accessing API
   * - Minimal user data returned (no password or sensitive fields)
   *
   * Performance:
   * - Runs on every authenticated request
   * - Database query is primary bottleneck
   * - Consider implementing user caching if needed
   *
   * @example
   * ```typescript
   * // In route handler:
   * @Get('profile')
   * @UseGuards(JwtAuthGuard)
   * getProfile(@Request() req) {
   *   console.log(req.user.id); // From validate() return value
   *   console.log(req.user.email);
   *   console.log(req.user.role);
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
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}