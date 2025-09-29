import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 *
 * NestJS guard that protects routes by requiring valid JWT access token.
 * Delegates authentication to JwtStrategy and blocks unauthenticated requests.
 *
 * Apply to routes using @UseGuards(JwtAuthGuard) decorator to require authentication.
 * Successfully authenticated requests have user object attached to request (req.user).
 *
 * @remarks
 * Authentication flow:
 * 1. Guard intercepts incoming request
 * 2. Extracts JWT token from Authorization header
 * 3. JwtStrategy validates token and user
 * 4. If valid: request proceeds with req.user populated
 * 5. If invalid: 401 Unauthorized response returned
 *
 * Token requirements:
 * - Must be present in Authorization header
 * - Format: "Authorization: Bearer <access_token>"
 * - Token must not be expired (15 minute window)
 * - User must exist and be active
 * - Token signature must be valid
 *
 * Usage patterns:
 * - Apply to individual routes: @UseGuards(JwtAuthGuard)
 * - Apply to entire controller: @UseGuards(JwtAuthGuard) on class
 * - Combine with RolesGuard for role-based authorization
 * - Public routes don't need this guard
 *
 * Error responses:
 * - 401 Unauthorized: Missing, invalid, or expired token
 * - 401 Unauthorized: User not found or inactive
 * - Does not distinguish between error types for security
 *
 * @example
 * ```typescript
 * // Protect single route
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@Request() req) {
 *   return req.user; // User object from JwtStrategy.validate()
 * }
 *
 * // Protect entire controller
 * @Controller('users')
 * @UseGuards(JwtAuthGuard)
 * export class UsersController {
 *   // All routes require authentication
 * }
 *
 * // Combine with roles guard for authorization
 * @Get('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * adminOnly() {
 *   return 'Admin content';
 * }
 * ```
 *
 * @see {@link JwtStrategy} for token validation logic
 * @see {@link AuthService.generateAccessToken} for token generation
 * @see {@link RolesGuard} for role-based authorization
 *
 * @since 1.0.0
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}