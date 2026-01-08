import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingsModule } from '../src/buildings/buildings.module';
import { SwaggerModule as AppSwaggerModule } from '../src/swagger/swagger.module';

async function generateOpenAPI() {
  try {
    // Set environment to skip DB connection for generation
    process.env.SKIP_DB_CONNECTION = 'true';
    process.env.GENERATE_OPENAPI = 'true';
    // Disable logging to reduce noise
    process.env.NODE_ENV = 'production';
    
    // Create testing module with TypeORM that will fail to connect
    // We'll catch the error and continue with Swagger generation
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.local', '.env'],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: 'postgresql://invalid:invalid@localhost:1/invalid',
          schema: 'listings',
          synchronize: false,
          logging: false,
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/../src/migrations/*{.ts,.js}'],
          migrationsTableName: 'typeorm_migrations',
          migrationsRun: false,
          retryAttempts: 0,
          connectTimeoutMS: 1,
          extra: {
            connectionTimeoutMillis: 1,
          },
          autoLoadEntities: false,
        }),
        BuildingsModule,
        AppSwaggerModule,
      ],
    })
      .compile();
    
    // Create NestJS app from testing module
    const app = moduleRef.createNestApplication();
    
    // Apply same global pipes as in main.ts (needed for Swagger to work properly)
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
    
    // Initialize app - TypeORM connection will fail, but we'll catch and continue
    let initSucceeded = false;
    try {
      await app.init();
      initSucceeded = true;
    } catch (initError: any) {
      // Check if it's a connection error
      const isConnectionError = 
        initError?.message?.includes('connect') || 
        initError?.message?.includes('ECONNREFUSED') ||
        initError?.message?.includes('timeout') ||
        initError?.message?.includes('Connection terminated') ||
        initError?.code === 'ECONNREFUSED' ||
        initError?.code === 'ETIMEDOUT' ||
        initError?.name === 'ConnectionError';
      
      if (isConnectionError) {
        // Connection failed, but Swagger doesn't need DB
        // Continue with Swagger generation anyway
        console.warn('⚠️  Database connection failed (expected for OpenAPI generation)');
        console.warn('   Continuing with Swagger generation...');
        initSucceeded = false;
      } else {
        // Not a connection error, re-throw
        throw initError;
      }
    }
    
    // Build Swagger document (same as in main.ts)
    // Note: Swagger generation doesn't require a database connection
    // It only needs controller metadata and DTOs
    const config = new DocumentBuilder()
      .setTitle('Listings Service API')
      .setDescription('API for managing building listings')
      .setVersion('1.0')
      .addTag('buildings')
      .build();
    
    // Generate OpenAPI document
    // This should work even if TypeORM connection failed
    // Try to generate even if app.init() failed
    let document;
    try {
      document = SwaggerModule.createDocument(app, config);
    } catch (swaggerError: any) {
      // If Swagger generation fails, check if it's because app wasn't initialized
      if (!initSucceeded) {
        console.error('❌ Error: Unable to generate Swagger document because app initialization failed.');
        console.error('   Swagger generation requires the app to be initialized.');
        console.error('   Please ensure TypeORM can be skipped during OpenAPI generation.');
        throw swaggerError;
      }
      throw swaggerError;
    }
    
    // Write to openapi.json in service root
    const outputPath = join(__dirname, '..', 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    
    console.log(`✅ OpenAPI spec generated: ${outputPath}`);
    
    await app.close();
    
    // Clean up env vars
    delete process.env.SKIP_DB_CONNECTION;
    delete process.env.GENERATE_OPENAPI;
    
    process.exit(0);
  } catch (error: any) {
    // Check if it's a connection error - if so, provide clear guidance
    const isConnectionError = 
      error?.message?.includes('connect') || 
      error?.message?.includes('ECONNREFUSED') ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('Connection terminated') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ENOTFOUND' ||
      error?.code === 'ETIMEDOUT' ||
      error?.name === 'ConnectionError';
    
    if (isConnectionError) {
      console.error('❌ Error: OpenAPI generation requires no database connection.');
      console.error('   TypeORM is attempting to connect during app initialization.');
      console.error('   This indicates a misconfiguration - OpenAPI generation should not require a DB.');
      console.error('');
      console.error('   Please ensure:');
      console.error('   1. TypeORM connection is properly configured to skip during generation');
      console.error('   2. AppModule does not eagerly initialize database connections');
      console.error('   3. No services are trying to connect during module initialization');
      process.exit(1);
    } else {
      console.error('❌ Error generating OpenAPI spec:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
      }
      process.exit(1);
    }
  }
}

generateOpenAPI();
