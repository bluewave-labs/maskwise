import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { DatasetsService } from '../datasets/datasets.service';
import { PrismaService } from '../common/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private projectsService: ProjectsService,
    private datasetsService: DatasetsService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    
    return null;
  }

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

  async logout(userId: string): Promise<void> {
    // Log the logout action
    await this.usersService.logAuditAction(userId, 'LOGOUT', 'user', userId);
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
      expiresIn: '7d', // Refresh token expires in 7 days
    });
  }

  private excludePassword(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

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
      console.error('Failed to create default project and dataset:', error);
    }
  }

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

      console.log(`Successfully created demo dataset for user ${userId} in project ${projectId}:`, demoDatasetResult.dataset.id);
    } catch (error) {
      console.error('Failed to create demo dataset:', error);
      // Don't throw - we don't want to fail user registration
    }
  }
}