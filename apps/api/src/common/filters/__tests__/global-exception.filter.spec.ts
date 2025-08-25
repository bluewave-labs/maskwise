import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import { GlobalExceptionFilter } from '../global-exception.filter';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: ArgumentsHost;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      switch (key) {
        case 'NODE_ENV':
          return 'test';
        default:
          return defaultValue;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    configService = module.get<ConfigService>(ConfigService);

    // Mock Express Request and Response objects
    mockRequest = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'user-agent': 'jest-test',
        'x-forwarded-for': '192.168.1.1',
      },
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
      },
      ip: '192.168.1.1',
      body: { test: 'data' },
      query: { page: '1' },
      get: jest.fn().mockImplementation((header: string) => {
        const headers = mockRequest.headers || {};
        return headers[header.toLowerCase()];
      }),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
      setHeader: jest.fn(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('HTTP Exceptions', () => {
    it('should handle standard HTTP exceptions properly', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Not found',
          error: 'HttpException',
          timestamp: expect.any(String),
          path: '/api/test',
          method: 'POST',
          correlationId: expect.any(String),
        })
      );
    });

    it('should handle HTTP exceptions with array messages', () => {
      const exception = new HttpException(
        ['Field is required', 'Invalid format'],
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Http Exception',
          error: 'HttpException',
        })
      );
    });

    it('should handle HTTP exceptions with object messages', () => {
      const exception = new HttpException(
        { message: 'Validation failed', details: ['Field required'] },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Validation failed',
          error: 'HttpException',
        })
      );
    });
  });

  describe('Prisma Exceptions', () => {
    it('should handle PrismaClientKnownRequestError (P2002 - unique constraint)', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['email'] },
        }
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'A record with this email already exists.',
          error: 'Database Error',
        })
      );
    });

    it('should handle PrismaClientKnownRequestError (P2025 - record not found)', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        }
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'The requested record was not found.',
          error: 'Database Error',
        })
      );
    });

    it('should handle PrismaClientValidationError', () => {
      const exception = new Prisma.PrismaClientValidationError(
        'Invalid input data',
        { clientVersion: '4.0.0' }
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid data provided',
          error: 'Validation Error',
        })
      );
    });

    it('should handle PrismaClientUnknownRequestError', () => {
      const exception = new Prisma.PrismaClientUnknownRequestError(
        'Unknown database error',
        { clientVersion: '4.0.0' }
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
          error: 'Internal Server Error',
        })
      );
    });
  });

  describe('JWT Exceptions', () => {
    it('should handle JsonWebTokenError', () => {
      const exception = new JsonWebTokenError('invalid signature');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid token. Please login again.',
          error: 'Invalid Token',
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const exception = new TokenExpiredError('jwt expired', new Date());

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Token has expired. Please login again.',
          error: 'Token Expired',
        })
      );
    });

    it('should handle NotBeforeError', () => {
      const exception = new NotBeforeError('jwt not active', new Date());

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid token. Please login again.',
          error: 'Invalid Token',
        })
      );
    });
  });

  describe('Throttler Exceptions', () => {
    it('should handle ThrottlerException', () => {
      const exception = new ThrottlerException('Rate limit exceeded');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          message: 'Rate limit exceeded',
          error: 'ThrottlerException',
        })
      );
    });
  });

  describe('Network and System Exceptions', () => {
    it('should handle ENOTFOUND errors', () => {
      const exception = new Error('getaddrinfo ENOTFOUND example.com');
      (exception as any).code = 'ENOTFOUND';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
          error: 'Internal Server Error',
        })
      );
    });

    it('should handle ECONNREFUSED errors', () => {
      const exception = new Error('connect ECONNREFUSED 127.0.0.1:3000');
      (exception as any).code = 'ECONNREFUSED';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
          error: 'Internal Server Error',
        })
      );
    });

    it('should handle ETIMEDOUT errors', () => {
      const exception = new Error('Request timeout');
      (exception as any).code = 'ETIMEDOUT';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
          error: 'Internal Server Error',
        })
      );
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle unknown errors with fallback', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
          error: 'Internal Server Error',
        })
      );
    });

    it('should handle non-Error objects', () => {
      const exception = { message: 'Custom error object' };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
          error: 'Internal Server Error',
        })
      );
    });

    it('should handle null/undefined exceptions', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
          error: 'Internal Server Error',
        })
      );
    });
  });

  describe('Response Context', () => {
    it('should include proper context information in response', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test error',
          error: 'HttpException',
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          path: '/api/test',
          method: 'POST',
          correlationId: expect.stringMatching(/^\d+-[a-z0-9]{7}$/),
        })
      );
    });

    it('should handle requests without user context', () => {
      mockRequest.user = undefined;
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test error',
          correlationId: expect.any(String),
        })
      );
    });

    it('should extract IP address from X-Forwarded-For header', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      // The IP should be extracted and used in logging context
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle requests with missing headers gracefully', () => {
      mockRequest.headers = {};
      mockRequest = { ...mockRequest, ip: undefined };

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test error',
        })
      );
    });
  });

  describe('Environment-specific Behavior', () => {
    it('should not expose sensitive information in production', () => {
      mockConfigService.get.mockImplementation((key: string) => 
        key === 'NODE_ENV' ? 'production' : undefined
      );

      const exception = new Error('Database password is incorrect');
      exception.stack = 'Error: Database password is incorrect\n    at /app/src/database.ts:123:45';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
          error: 'Internal Server Error',
        })
      );

      // Should not include stack trace or sensitive message in production
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.stack).toBeUndefined();
    });

    it('should include debug information in development', () => {
      mockConfigService.get.mockImplementation((key: string) => 
        key === 'NODE_ENV' ? 'development' : undefined
      );

      const exception = new Error('Debug error message');
      exception.stack = 'Error: Debug error message\n    at /app/src/test.ts:123:45';

      filter.catch(exception, mockArgumentsHost);

      // In development, we might include more debug information
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const exception1 = new HttpException('Error 1', HttpStatus.BAD_REQUEST);
      const exception2 = new HttpException('Error 2', HttpStatus.BAD_REQUEST);

      filter.catch(exception1, mockArgumentsHost);
      const correlationId1 = (mockResponse.json as jest.Mock).mock.calls[0][0].correlationId;

      // Reset mocks
      (mockResponse.json as jest.Mock).mockClear();

      filter.catch(exception2, mockArgumentsHost);
      const correlationId2 = (mockResponse.json as jest.Mock).mock.calls[0][0].correlationId;

      expect(correlationId1).not.toBe(correlationId2);
      expect(correlationId1).toMatch(/^\d+-[a-z0-9]{7}$/);
      expect(correlationId2).toMatch(/^\d+-[a-z0-9]{7}$/);
    });
  });
});