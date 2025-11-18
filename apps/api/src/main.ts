import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PrismaService } from './common/prisma.service';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Fix BigInt serialization globally - use toString() to avoid precision loss
  (BigInt.prototype as any).toJSON = function() {
    return this.toString();
  };

  // Test database connection on startup
  const prisma = app.get(PrismaService);
  try {
    await prisma.$connect();
    logger.log('✅ Database connection established successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to database', error.stack);
    logger.error('Please check DATABASE_URL environment variable and ensure PostgreSQL is running');
    process.exit(1);
  }

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // SECURITY: Cookie parser middleware for HttpOnly authentication cookies
  app.use(cookieParser());

  // Global exception filter (must be before validation pipe)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
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

  // CORS configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigins = isProduction
    ? // Production: Only allow configured origins
      process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
        : [process.env.FRONTEND_URL || 'http://localhost:3000']
    : // Development: Allow multiple localhost ports for convenience
      [
        'http://localhost:3000',
        'http://localhost:3004',
        'http://localhost:3005',
        'http://localhost:4200',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Swagger API documentation (temporarily disabled due to metadata issues)
  // const config = new DocumentBuilder()
  //   .setTitle('Maskwise API')
  //   .setDescription('PII Detection and Anonymization Platform API')
  //   .setVersion('1.0')
  //   .addBearerAuth(
  //     {
  //       type: 'http',
  //       scheme: 'bearer',
  //       bearerFormat: 'JWT',
  //       name: 'JWT',
  //       description: 'Enter JWT token',
  //       in: 'header',
  //     },
  //     'JWT-auth',
  //   )
  //   .build();

  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api/docs', app, document, {
  //   swaggerOptions: {
  //     persistAuthorization: true,
  //   },
  // });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Maskwise API running on http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();