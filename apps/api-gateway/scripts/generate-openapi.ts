import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
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
    
    // Create NestJS app instance
    // Note: NestFactory.create() already initializes the app
    let app;
    try {
      app = await NestFactory.create(AppModule, { 
        logger: false,
        abortOnError: false, // Don't abort on errors during generation
      });
    } catch (createError: any) {
      // If it's a connection error during creation, that's expected
      if (createError?.message?.includes('connect') || 
          createError?.message?.includes('ECONNREFUSED') ||
          createError?.code === 'ECONNREFUSED' ||
          createError?.code === 'ENOTFOUND') {
        console.log('⚠️  External service connections failed (expected for generation), retrying...');
        app = await NestFactory.create(AppModule, { 
          logger: false,
          abortOnError: false,
        });
      } else {
        throw createError;
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

