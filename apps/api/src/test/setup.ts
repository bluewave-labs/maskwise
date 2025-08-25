import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../common/prisma.service';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';

// Global test configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://maskwise:maskwise_dev_password@localhost:5432/maskwise_test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only';
process.env.REDIS_URL = process.env.REDIS_URL_TEST || 'redis://localhost:6379/1';

// Increase timeout for database operations in tests
jest.setTimeout(30000);

// Global test utilities
export class TestHelper {
  static async createTestApplication(modules: any[] = []): Promise<INestApplication> {
    const moduleBuilder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env.local', '.env'],
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 1000, // Higher limit for tests
          },
        ]),
        ...modules,
      ],
    });

    const moduleRef = await moduleBuilder.compile();
    const app = moduleRef.createNestApplication();

    // Apply same middleware as main app
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    return app;
  }

  static async closeApplication(app: INestApplication): Promise<void> {
    if (app) {
      await app.close();
    }
  }

  static async cleanupDatabase(): Promise<void> {
    const prisma = new PrismaService();
    await prisma.onModuleInit();
    
    try {
      // Clean up test data in reverse dependency order
      await prisma.auditLog.deleteMany({});
      await prisma.finding.deleteMany({});
      await prisma.job.deleteMany({});
      await prisma.dataset.deleteMany({});
      await prisma.policyVersion.deleteMany({});
      await prisma.policy.deleteMany({});
      await prisma.project.deleteMany({});
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test',
          },
        },
      });
    } catch (error) {
      console.warn('Database cleanup error (may be expected):', error.message);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Mock external services by default
jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Global setup and teardown
beforeAll(async () => {
  // Global setup if needed
});

afterAll(async () => {
  // Global cleanup if needed
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});