import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role-Based Authorization Guard
 *
 * NestJS guard that enforces role-based access control (RBAC) by checking if
 * authenticated user has required role(s) to access protected routes.
 *
 * Must be used with JwtAuthGuard (authentication) and @Roles decorator to
 * specify required roles. Provides fine-grained authorization on top of authentication.
 *
 * @remarks
 * Authorization flow:
 * 1. Extract required roles from @Roles decorator metadata
 * 2. If no roles specified: allow access (no authorization needed)
 * 3. Extract user from request (populated by JwtAuthGuard)
 * 4. If no user: deny access (authentication failed)
 * 5. Check if user's role matches any required role
 * 6. Allow access if match found, deny otherwise
 *
 * Role checking:
 * - Uses inclusive OR logic (user needs ANY of the specified roles)
 * - Single role comparison using string equality
 * - Case-sensitive role matching
 * - No role hierarchy (ADMIN doesn't inherit USER permissions)
 *
 * Guard ordering:
 * - MUST come AFTER JwtAuthGuard in guard chain
 * - JwtAuthGuard populates req.user needed by this guard
 * - Wrong order results in no user and automatic denial
 *
 * Metadata reflection:
 * - Uses NestJS Reflector to read @Roles decorator metadata
 * - Checks both method and class level decorators
 * - Method-level decorator overrides class-level
 *
 * Security:
 * - Returns 403 Forbidden if user lacks required role
 * - Returns 401 Unauthorized if not authenticated
 * - No information leakage about required roles
 * - Silent fail (no detailed error messages)
 *
 * @example
 * ```typescript
 * // Admin-only route
 * @Get('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * adminOnly() {
 *   return 'Only admins can see this';
 * }
 *
 * // Multiple roles (OR logic)
 * @Get('data')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN', 'DATA_ENGINEER')
 * getData() {
 *   return 'Admins or Data Engineers can access';
 * }
 *
 * // Class-level authorization
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * export class AdminController {
 *   // All routes require ADMIN role
 * }
 *
 * // No roles = public for authenticated users
 * @Get('profile')
 * @UseGuards(JwtAuthGuard) // Only auth, no roles
 * getProfile() {
 *   return 'Any authenticated user can access';
 * }
 * ```
 *
 * @see {@link Roles} decorator for specifying required roles
 * @see {@link JwtAuthGuard} for authentication (must come first)
 * @see {@link User.role} for available role values
 *
 * @since 1.0.0
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Initializes roles guard with reflector
   *
   * @param reflector - NestJS reflector for reading decorator metadata
   */
  constructor(private reflector: Reflector) {}

  /**
   * Determines if user has required role to access route
   *
   * Called automatically by NestJS before route handler executes.
   * Returns true to allow access, false to deny with 403 Forbidden.
   *
   * @param context - Execution context containing request and metadata
   * @returns True if access allowed, false if denied
   *
   * @remarks
   * Decision logic:
   * 1. No roles specified → Allow (public authenticated route)
   * 2. No user in request → Deny (authentication failed)
   * 3. User role matches any required role → Allow
   * 4. User role doesn't match → Deny
   *
   * Metadata precedence:
   * - Method decorator overrides class decorator
   * - getAllAndOverride merges and prioritizes method-level
   * - Returns first non-undefined value found
   *
   * Common denial reasons:
   * - User not authenticated (no req.user)
   * - User has wrong role (e.g., USER trying to access ADMIN route)
   * - Guards in wrong order (RolesGuard before JwtAuthGuard)
   *
   * Performance:
   * - Simple role string comparison (O(n) where n = number of required roles)
   * - Typically 1-3 roles, so effectively O(1)
   * - No database queries (role from JWT token)
   *
   * @example
   * ```typescript
   * // Internal NestJS execution:
   * // 1. JwtAuthGuard runs first, populates req.user
   * // 2. RolesGuard.canActivate() called
   * // 3. Returns true/false based on role check
   * // 4. If false: 403 response, route handler never called
   * // 5. If true: route handler executes normally
   * ```
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false; // No user, deny access
    }

    return requiredRoles.includes(user.role);
  }
}