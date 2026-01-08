import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generateOpenAPI() {
  try {
    // Set environment variables for generation (mock service URLs)
    const originalListingsUrl = process.env.LISTINGS_SERVICE_URL;
    const originalAdminKey = process.env.ADMIN_API_KEY;
    
    process.env.LISTINGS_SERVICE_URL = 'http://localhost:3001';
    process.env.ADMIN_API_KEY = 'dummy-key-for-generation';
    // Disable logging to reduce noise
    process.env.NODE_ENV = 'production';
    
    // Create testing module to properly initialize NestJS context
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    // Create NestJS app from testing module
    const app = moduleRef.createNestApplication();
    
    // Initialize app
    let initSucceeded = false;
    try {
      await app.init();
      initSucceeded = true;
    } catch (initError: any) {
      // Check if it's a connection error (expected for generation)
      const isConnectionError = 
        initError?.message?.includes('connect') || 
        initError?.message?.includes('ECONNREFUSED') ||
        initError?.message?.includes('timeout') ||
        initError?.code === 'ECONNREFUSED' ||
        initError?.code === 'ENOTFOUND' ||
        initError?.code === 'ETIMEDOUT';
      
      if (isConnectionError) {
        console.warn('⚠️  External service connections failed (expected for OpenAPI generation)');
        console.warn('   Continuing with Swagger generation...');
        initSucceeded = false;
      } else {
        throw initError;
      }
    }
    
    // Apply same global pipes as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    
    // Build Swagger document (same as in main.ts)
    const config = new DocumentBuilder()
      .setTitle('API Gateway')
      .setDescription('API Gateway for New Building Portal')
      .setVersion('1.0')
      .addTag('buildings', 'Public building endpoints')
      .addTag('admin-buildings', 'Admin building endpoints')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-admin-key',
          in: 'header',
          description: 'Admin API key for admin endpoints',
        },
        'admin-key',
      )
      .build();
    
    // Create document with options to handle parameter metadata issues
    const document = SwaggerModule.createDocument(app, config, {
      ignoreGlobalPrefix: false,
      deepScanRoutes: true,
      extraModels: [],
    });
    
    // Write to openapi.json in service root
    const outputPath = join(__dirname, '..', 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    
    console.log(`✅ OpenAPI spec generated: ${outputPath}`);
    
    await app.close();
    
    // Restore original env vars
    if (originalListingsUrl !== undefined) process.env.LISTINGS_SERVICE_URL = originalListingsUrl;
    if (originalAdminKey !== undefined) process.env.ADMIN_API_KEY = originalAdminKey;
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating OpenAPI spec:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

generateOpenAPI();

