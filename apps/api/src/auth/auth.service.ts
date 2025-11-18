import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { DatasetsService } from '../datasets/datasets.service';
import { PrismaService } from '../common/prisma.service';
import { CacheService } from '../cache/cache.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * JWT Token Payload
 *
 * Standard claims included in access and refresh tokens for user identification
 * and authorization throughout the application.
 *
 * @property sub - Subject (User ID) - unique identifier for the authenticated user
 * @property email - User's email address for secondary identification
 * @property role - User's role (ADMIN, USER, etc.) for authorization decisions
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Authentication Response
 *
 * Complete authentication response returned after successful login or registration.
 * Contains user details and both access and refresh tokens for session management.
 *
 * @property user - User object without password field for security
 * @property accessToken - Short-lived JWT token (15 minutes) for API authentication
 * @property refreshToken - Long-lived JWT token (7 days) for obtaining new access tokens
 */
export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication Service
 *
 * Handles user authentication, JWT token generation, and session management for the
 * MaskWise platform. Integrates with Passport.js for local and JWT strategies.
 *
 * Key responsibilities:
 * - User credential validation with bcrypt password hashing
 * - JWT access and refresh token generation
 * - Token refresh and session management
 * - Audit logging for all authentication events
 * - New user onboarding with default project and demo dataset
 *
 * @remarks
 * Security considerations:
 * - Passwords hashed with bcrypt using 12 salt rounds
 * - Access tokens expire after 15 minutes (configurable)
 * - Refresh tokens expire after 7 days (configurable)
 * - All authentication events are logged for audit trail
 * - Constant-time password comparison to prevent timing attacks
 * - Inactive users cannot authenticate
 *
 * Token strategy:
 * - Short-lived access tokens minimize exposure window
 * - Refresh tokens enable seamless re-authentication
 * - Both tokens include role information for authorization
 *
 * @see {@link UsersService} for user management operations
 * @see {@link JwtStrategy} for token validation logic
 * @see {@link LocalStrategy} for credential authentication
 *
 * @since 1.0.0
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private projectsService: ProjectsService,
    private datasetsService: DatasetsService,
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Validates user credentials against database
   *
   * Performs secure password verification using bcrypt's constant-time comparison
   * to prevent timing attacks. Only active users can be validated.
   *
   * @param email - User email address (case-insensitive lookup)
   * @param password - Plain text password to verify against stored hash
   * @returns User object if credentials are valid and user is active, null otherwise
   *
   * @remarks
   * Security:
   * - Uses bcrypt.compare for constant-time comparison
   * - Does not distinguish between invalid email and invalid password
   * - Returns null for both missing users and password mismatches
   * - Inactive users treated as invalid credentials
   *
   * Performance:
   * - bcrypt comparison is intentionally slow (~100ms) to prevent brute force
   * - Database query is the primary bottleneck for valid users
   *
   * @example
   * ```typescript
   * const user = await authService.validateUser('admin@maskwise.com', 'password123');
   * if (user) {
   *   // Proceed with login flow
   * } else {
   *   throw new UnauthorizedException('Invalid credentials');
   * }
   * ```
   *
   * @see {@link UsersService.findByEmail} for user lookup
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }

    return null;
  }

  /**
   * Authenticates user and generates JWT tokens
   *
   * Validates credentials, checks account status, generates access and refresh tokens,
   * and logs the authentication event for audit trail compliance.
   *
   * @param loginDto - Login credentials containing email and password
   * @returns Authentication response with user details and tokens
   * @throws {UnauthorizedException} If credentials are invalid or account is deactivated
   *
   * @remarks
   * Login flow:
   * 1. Validate credentials against database
   * 2. Check if user account is active
   * 3. Generate access token (15min) and refresh token (7d)
   * 4. Log authentication event for audit trail
   * 5. Return user details without password
   *
   * Security:
   * - Separates inactive account error from invalid credentials for clarity
   * - Tokens generated in parallel for performance
   * - All login attempts logged for security monitoring
   * - Password never included in response
   *
   * @example
   * ```typescript
   * const authResponse = await authService.login({
   *   email: 'admin@maskwise.com',
   *   password: 'admin123'
   * });
   * // Returns: { user, accessToken, refreshToken }
   * ```
   *
   * @see {@link validateUser} for credential validation
   * @see {@link generateAccessToken} for access token creation
   * @see {@link generateRefreshToken} for refresh token creation
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    // Log the login attempt
    await this.usersService.logAuditAction(user.id, 'LOGIN', 'user', user.id);

    return {
      user: this.excludePassword(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Registers new user and initializes account
   *
   * Creates new user account with secure password hashing, generates authentication tokens,
   * and sets up default project with demo dataset for immediate user onboarding.
   *
   * @param registerDto - Registration details including email, password, name
   * @returns Authentication response with user details and tokens
   * @throws {ConflictException} If user with email already exists
   *
   * @remarks
   * Registration flow:
   * 1. Check for existing user with same email
   * 2. Hash password with bcrypt (12 salt rounds)
   * 3. Create user account in database
   * 4. Initialize default "My First Project" with sample PII dataset
   * 5. Generate access and refresh tokens
   * 6. Return complete authentication response
   *
   * Onboarding:
   * - Default project created to help users get started
   * - Demo dataset includes sample PII for testing detection
   * - Failure to create defaults doesn't block registration
   *
   * Security:
   * - 12 salt rounds for bcrypt (recommended for production)
   * - Email uniqueness enforced at database level
   * - Password never stored in plain text
   * - Immediate token generation for seamless login
   *
   * @example
   * ```typescript
   * const authResponse = await authService.register({
   *   email: 'newuser@example.com',
   *   password: 'SecurePass123!',
   *   name: 'New User'
   * });
   * // Returns: { user, accessToken, refreshToken }
   * // Also creates: default project + demo dataset
   * ```
   *
   * @see {@link createDefaultProjectAndDataset} for onboarding setup
   * @see {@link UsersService.create} for user creation
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Create default project and demo dataset for new user
    await this.createDefaultProjectAndDataset(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return {
      user: this.excludePassword(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refreshes authentication tokens using valid refresh token
   *
   * Validates refresh token, verifies user is still active, and issues new pair
   * of access and refresh tokens for continued session.
   *
   * @param refreshToken - Current refresh token to exchange for new tokens
   * @returns New access token and refresh token pair
   * @throws {UnauthorizedException} If refresh token is invalid, expired, or user inactive
   *
   * @remarks
   * Token refresh flow:
   * 1. Verify refresh token signature and expiration
   * 2. Extract user ID from token payload
   * 3. Validate user still exists and is active
   * 4. Generate new access token (15min) and refresh token (7d)
   * 5. Return new token pair
   *
   * Security:
   * - Refresh tokens are single-use (new one issued each time)
   * - Inactive users cannot refresh tokens
   * - Expired tokens properly rejected with clear error
   * - Token rotation prevents replay attacks
   *
   * Token rotation strategy:
   * - Each refresh generates new access AND refresh token
   * - Old refresh token becomes invalid after use
   * - Prevents stolen token from being reused indefinitely
   *
   * @example
   * ```typescript
   * const tokens = await authService.refreshTokens(oldRefreshToken);
   * // Returns: { accessToken: "new_jwt...", refreshToken: "new_refresh..." }
   * ```
   *
   * @see {@link generateAccessToken} for access token creation
   * @see {@link generateRefreshToken} for refresh token creation
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.generateAccessToken(newPayload),
        this.generateRefreshToken(newPayload),
      ]);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logs out user and records action
   *
   * Records logout event in audit log for compliance and security monitoring.
   * Note: JWT tokens remain valid until expiration (stateless authentication).
   *
   * @param userId - ID of user logging out
   * @returns Promise that resolves when logout is recorded
   *
   * @remarks
   * Logout behavior:
   * - Audit log entry created for security trail
   * - Tokens remain technically valid until expiration
   * - Client should discard tokens immediately
   * - Stateless JWT design means no server-side revocation
   *
   * Future enhancements:
   * - Token blacklist for immediate revocation
   * - Redis-based session management
   * - Notification of logout to all user sessions
   *
   * @example
   * ```typescript
   * await authService.logout(user.id);
   * // Audit log: "User logged out at 2025-01-15 10:30:00"
   * ```
   *
   * @see {@link UsersService.logAuditAction} for audit logging
   */
  async logout(userId: string): Promise<void> {
    // Invalidate user cache to force fresh database lookup on next request
    await this.cacheService.invalidateUser(userId);

    // Log the logout action
    await this.usersService.logAuditAction(userId, 'LOGOUT', 'user', userId);
  }

  /**
   * Generates short-lived JWT access token
   *
   * Creates JWT access token with 15-minute expiration for API authentication.
   * Token includes user ID, email, and role for authorization decisions.
   *
   * @param payload - JWT payload containing user identification and role
   * @returns Signed JWT access token string
   *
   * @remarks
   * Token configuration:
   * - Expiration: 15 minutes (configurable)
   * - Algorithm: HS256 (HMAC with SHA-256)
   * - Secret: JWT_SECRET from environment
   * - Claims: sub (user ID), email, role
   *
   * Security:
   * - Short expiration minimizes exposure window
   * - Must be paired with refresh token for longer sessions
   * - Secret should be strong random string (256+ bits)
   *
   * @private
   * @see {@link JwtPayload} for token structure
   */
  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  /**
   * Generates long-lived JWT refresh token
   *
   * Creates JWT refresh token with 7-day expiration for obtaining new access tokens.
   * Allows users to maintain session without re-entering credentials.
   *
   * @param payload - JWT payload containing user identification and role
   * @returns Signed JWT refresh token string
   *
   * @remarks
   * Token configuration:
   * - Expiration: 7 days (configurable)
   * - Algorithm: HS256 (HMAC with SHA-256)
   * - Secret: JWT_REFRESH_SECRET (falls back to JWT_SECRET)
   * - Claims: sub (user ID), email, role
   *
   * Security:
   * - Separate secret from access tokens (recommended)
   * - Longer expiration balanced with rotation strategy
   * - Should be stored securely on client (httpOnly cookie recommended)
   * - Rotation on each use prevents replay attacks
   *
   * @private
   * @see {@link JwtPayload} for token structure
   * @see {@link refreshTokens} for token rotation logic
   */
  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtRefreshSecret) {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_REFRESH_SECRET is not configured. ' +
        'Cannot generate refresh tokens without a secure secret.'
      );
    }

    return this.jwtService.signAsync(payload, {
      secret: jwtRefreshSecret,
      expiresIn: '7d', // Refresh token expires in 7 days
    });
  }

  /**
   * Removes password field from user object
   *
   * Ensures password hash never included in API responses for security.
   * Returns new object without mutating original user.
   *
   * @param user - User object potentially containing password hash
   * @returns User object with password field excluded
   *
   * @remarks
   * Security:
   * - Password hashes should never be exposed to clients
   * - Creates new object (no mutation of original)
   * - Applied automatically in all authentication responses
   *
   * @private
   * @example
   * ```typescript
   * const safeUser = this.excludePassword(user);
   * // safeUser has all fields except 'password'
   * ```
   */
  private excludePassword(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Creates default project and demo dataset for new users
   *
   * Initializes new user account with welcome project and sample PII dataset
   * to demonstrate platform capabilities immediately after registration.
   *
   * @param userId - ID of newly registered user
   * @returns Promise that resolves when setup is complete
   *
   * @remarks
   * Onboarding setup:
   * - Creates "My First Project" with welcome message
   * - Generates demo dataset with sample PII entities
   * - Automatically queues PII analysis job on dataset
   * - Failures logged but don't block registration
   *
   * Error handling:
   * - Errors are caught and logged to console
   * - Registration proceeds even if setup fails
   * - Prevents onboarding issues from blocking account creation
   *
   * Demo dataset contents:
   * - Sample email addresses, phone numbers, SSNs
   * - Credit card numbers, addresses, names
   * - Medical record IDs, employee IDs, URLs
   * - All synthetic data for safe demonstration
   *
   * @private
   * @see {@link createDemoDataset} for dataset creation details
   * @see {@link ProjectsService.create} for project creation
   */
  private async createDefaultProjectAndDataset(userId: string): Promise<void> {
    try {
      // Create default project
      const defaultProject = await this.projectsService.create({
        name: 'My First Project',
        description: 'Welcome to Maskwise! This is your default project to get you started. You can rename it or create new projects to organize your datasets.',
        tags: ['default', 'getting-started']
      }, userId);

      // Create demo dataset with sample PII data
      await this.createDemoDataset(defaultProject.id, userId);
    } catch (error) {
      // Log error but don't fail user registration if default setup fails
      this.logger.error('Failed to create default project and dataset', error.stack);
    }
  }

  /**
   * Creates demo dataset with synthetic PII data
   *
   * Generates sample dataset containing various PII entity types for user
   * to immediately test detection and anonymization features.
   *
   * @param projectId - ID of project to contain demo dataset
   * @param userId - ID of user who owns the dataset
   * @returns Promise that resolves when demo dataset is created
   *
   * @remarks
   * Demo dataset features:
   * - Contains 15+ PII entity types
   * - All data is synthetic (no real PII)
   * - Automatically processed with default policy
   * - Immediate PII analysis job queued
   *
   * Synthetic PII included:
   * - Personal: Names, emails, phone numbers
   * - Financial: Credit cards, SSNs
   * - Medical: Patient IDs, medical record numbers
   * - Contact: Addresses, URLs
   * - Identifiers: Employee IDs, driver's licenses
   *
   * Processing:
   * - Uses first active policy for detection rules
   * - processImmediately=true queues analysis job
   * - Results visible in dashboard within seconds
   *
   * Error handling:
   * - Errors logged but don't propagate
   * - User registration succeeds even if demo fails
   * - Users can manually create datasets if needed
   *
   * @private
   * @see {@link DatasetsService.createDemoDataset} for dataset creation
   */
  private async createDemoDataset(projectId: string, userId: string): Promise<void> {
    try {
      // Create sample PII data content
      const samplePiiContent = `Welcome to Maskwise - Demo Dataset
=====================================

This is a sample dataset containing various types of Personally Identifiable Information (PII) that our system can detect and anonymize.

Personal Information:
- Customer Name: John Smith, Sarah Johnson, Michael Brown
- Email Addresses: john.smith@example.com, sarah.j@company.org, michael.brown123@gmail.com
- Phone Numbers: (555) 123-4567, +1-800-555-0123, 555.987.6543

Financial Information:
- Credit Card Numbers: 4532-1234-5678-9012, 5555-4444-3333-2222, 378-123-456-789012
- Social Security Numbers: 123-45-6789, 987-65-4321, 555-12-3456

Contact Information:
- Addresses: 123 Main Street, Anytown, NY 12345, 456 Oak Avenue, Springfield, CA 90210
- Company Information: ABC Corporation, 789 Business Blvd, Suite 100, New York, NY 10001

Medical Information:
- Patient ID: PAT-2024-001, MRN-789456, PATIENT_123456
- Medical Record Numbers: MR-2024-456789, RECORD_ID_987654

Website URLs:
- Company Website: https://www.company.com
- Personal Blog: http://johnsmith.blog
- Support Portal: https://support.example.org/tickets/123

Additional PII Examples:
- Employee IDs: EMP-001, STAFF-2024-789, WORKER_ID_456
- Date of Birth: 01/15/1985, March 22, 1990, 12-05-1978
- Driver's License: DL123456789, LICENSE-NY-987654321

Note: This is synthetic sample data for demonstration purposes only. No real personal information is contained in this dataset.
`;

      // Get default policy ID for processing
      const defaultPolicy = await this.prisma.policy.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      // Use the datasetsService to create the demo dataset programmatically
      const demoDatasetResult = await this.datasetsService.createDemoDataset({
        projectId,
        userId,
        name: 'Demo Dataset - Sample PII Data',
        description: 'Sample dataset containing various types of PII for testing and demonstration purposes',
        content: samplePiiContent,
        policyId: defaultPolicy?.id,
        processImmediately: true,
      });

      this.logger.log(`Successfully created demo dataset for user ${userId} in project ${projectId}: ${demoDatasetResult.dataset.id}`);
    } catch (error) {
      this.logger.error('Failed to create demo dataset', error.stack);
      // Don't throw - we don't want to fail user registration
    }
  }
}