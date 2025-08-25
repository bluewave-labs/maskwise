import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: 'user-1',
    email: 'admin@maskwise.com',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET', 'test-secret'),
            signOptions: { expiresIn: '15m' },
          }),
          inject: [ConfigService],
        }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'admin@maskwise.com',
      password: 'admin123',
    };

    it('should successfully login with valid credentials', async () => {
      const expectedResult = {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          status: mockUser.status,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@maskwise.com',
      password: 'newpassword123',
    };

    it('should successfully register a new user', async () => {
      const expectedResult = {
        user: {
          id: 'user-2',
          email: registerDto.email,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw ConflictException for existing email', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('User with this email already exists')
      );

      await expect(controller.register(registerDto)).rejects.toThrow(ConflictException);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refresh', () => {
    const refreshDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should successfully refresh tokens', async () => {
      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshDto);

      expect(authService.refreshTokens).toHaveBeenCalledWith(refreshDto.refreshToken);
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockAuthService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token')
      );

      await expect(controller.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.refreshTokens).toHaveBeenCalledWith(refreshDto.refreshToken);
    });
  });

  describe('logout', () => {
    const mockRequest = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
      },
    };

    it('should successfully logout user', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest as any);

      expect(authService.logout).toHaveBeenCalledWith(mockRequest.user.id);
      expect(result).toEqual({ message: 'Logout successful' });
    });

    it('should handle logout errors gracefully', async () => {
      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      await expect(controller.logout(mockRequest as any)).rejects.toThrow('Logout failed');
      expect(authService.logout).toHaveBeenCalledWith(mockRequest.user.id);
    });
  });
});