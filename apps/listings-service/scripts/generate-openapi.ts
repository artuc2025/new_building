import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generateOpenAPI() {
  try {
    // Set environment to skip DB connection for generation
    // Use a connection string that will fail gracefully
    // TypeORM will try to connect but we'll catch the error
    const originalDbUrl = process.env.DATABASE_URL;
    const originalDbUrlListings = process.env.DATABASE_URL_LISTINGS;
    
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
    process.env.DATABASE_URL_LISTINGS = 'postgresql://dummy:dummy@localhost:5432/dummy';
    // Disable logging to reduce noise
    process.env.NODE_ENV = 'production';
    
    // Create NestJS app instance
    // Note: NestFactory.create() already initializes the app
    // TypeORM connection will fail, but we'll catch and continue
    let app;
    try {
      app = await NestFactory.create(AppModule, { 
        logger: false,
        abortOnError: false, // Don't abort on errors during generation
      });
    } catch (createError: any) {
      // If it's a database connection error during creation, that's expected
      if (createError?.message?.includes('connect') || 
          createError?.message?.includes('ECONNREFUSED') ||
          createError?.code === 'ECONNREFUSED' ||
          createError?.code === 'ENOTFOUND') {
        console.log('⚠️  Database connection failed (expected for generation), retrying...');
        // Try again - sometimes the error is caught at module level
        app = await NestFactory.create(AppModule, { 
          logger: false,
          abortOnError: false,
        });
      } else {
        throw createError;
      }
    }
    
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
    
    // Build Swagger document (same as in main.ts)
    const config = new DocumentBuilder()
      .setTitle('Listings Service API')
      .setDescription('API for managing building listings')
      .setVersion('1.0')
      .addTag('buildings')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    
    // Write to openapi.json in service root
    const outputPath = join(__dirname, '..', 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    
    console.log(`✅ OpenAPI spec generated: ${outputPath}`);
    
    await app.close();
    
    // Restore original env vars
    if (originalDbUrl !== undefined) process.env.DATABASE_URL = originalDbUrl;
    if (originalDbUrlListings !== undefined) process.env.DATABASE_URL_LISTINGS = originalDbUrlListings;
    
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

