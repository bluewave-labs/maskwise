import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * Local Authentication Strategy
 *
 * Passport.js strategy for validating username/password credentials during login.
 * Uses email as username field and delegates validation to AuthService.
 *
 * This strategy is used by LocalAuthGuard on the login endpoint to verify
 * user credentials before generating JWT tokens.
 *
 * @remarks
 * Authentication flow:
 * 1. Extract email and password from request body
 * 2. Validate credentials via AuthService (bcrypt comparison)
 * 3. Return user object if valid, throw exception if invalid
 * 4. User object attached to request for controller to use
 *
 * Configuration:
 * - usernameField: 'email' (expects email instead of username)
 * - passwordField: 'password' (default, can be omitted)
 * - Request body must contain: { email, password }
 *
 * Security:
 * - Delegates to AuthService.validateUser for secure password comparison
 * - bcrypt constant-time comparison prevents timing attacks
 * - Does not distinguish between invalid email and invalid password
 * - Inactive users cannot authenticate
 *
 * Usage:
 * Applied to login route with @UseGuards(LocalAuthGuard)
 * Controller receives validated user in req.user
 *
 * @example
 * ```typescript
 * // In auth controller:
 * @Post('login')
 * @UseGuards(LocalAuthGuard)
 * async login(@Request() req) {
 *   // req.user populated by this strategy's validate() method
 *   return this.authService.login(req.user);
 * }
 * ```
 *
 * @see {@link LocalAuthGuard} for guard implementation
 * @see {@link AuthService.validateUser} for credential validation
 * @see {@link AuthService.login} for token generation after successful validation
 *
 * @since 1.0.0
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  /**
   * Initializes local strategy with email as username field
   *
   * @param authService - Auth service for credential validation
   */
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  /**
   * Validates user credentials
   *
   * Called automatically by Passport.js when LocalAuthGuard is used.
   * Extracts email and password from request body and validates against database.
   *
   * @param email - User email address from request body
   * @param password - Plain text password from request body
   * @returns User object if credentials are valid
   * @throws {UnauthorizedException} If credentials are invalid or user inactive
   *
   * @remarks
   * Validation process:
   * - AuthService.validateUser performs bcrypt comparison
   * - Returns null if email not found or password incorrect
   * - Returns null if user account is inactive
   * - Returns user object if all checks pass
   *
   * Security:
   * - Password never logged or exposed in error messages
   * - Generic error message prevents username enumeration
   * - Bcrypt comparison is intentionally slow to prevent brute force
   *
   * Performance:
   * - Primary bottleneck is bcrypt comparison (~100ms)
   * - Database query is secondary bottleneck
   * - Rate limiting recommended at API level
   *
   * @example
   * ```typescript
   * // This method is called automatically by Passport.js:
   * // POST /auth/login
   * // Body: { "email": "user@example.com", "password": "secretpass" }
   * // Result: User object attached to req.user
   * ```
   */
  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}