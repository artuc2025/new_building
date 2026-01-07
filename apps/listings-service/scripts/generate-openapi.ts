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
    // This prevents TypeORM from trying to connect at all
    process.env.SKIP_DB_CONNECTION = 'true';
    process.env.GENERATE_OPENAPI = 'true';
    // Disable logging to reduce noise
    process.env.NODE_ENV = 'production';
    
    // Create NestJS app instance
    // TypeORM connection will fail, but we'll catch and continue
    // Swagger doesn't need a database connection - it only needs controller metadata
    let app;
    try {
      app = await NestFactory.create(AppModule, { 
        logger: false,
        abortOnError: false, // Don't abort on errors during generation
      });
    } catch (createError: any) {
      // If it's a database connection error, that's expected during OpenAPI generation
      // Swagger doesn't need the database, so we can continue
      if (createError?.message?.includes('connect') || 
          createError?.message?.includes('ECONNREFUSED') ||
          createError?.code === 'ECONNREFUSED' ||
          createError?.code === 'ENOTFOUND' ||
          createError?.name === 'ConnectionError') {
        // Try to create app again - sometimes the error is caught at module level
        // and the app can still be created
        try {
          app = await NestFactory.create(AppModule, { 
            logger: false,
            abortOnError: false,
          });
        } catch (retryError: any) {
          // If it still fails, log but continue - Swagger might still work
          console.log('⚠️  Database connection failed (expected for generation), continuing...');
          // Re-throw if it's not a connection error
          if (!retryError?.message?.includes('connect') && 
              !retryError?.message?.includes('ECONNREFUSED') &&
              retryError?.code !== 'ECONNREFUSED' &&
              retryError?.code !== 'ENOTFOUND' &&
              retryError?.name !== 'ConnectionError') {
            throw retryError;
          }
          // If it's still a connection error, try one more time with a delay
          await new Promise(resolve => setTimeout(resolve, 100));
          app = await NestFactory.create(AppModule, { 
            logger: false,
            abortOnError: false,
          });
        }
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
    // Note: Swagger generation doesn't require a database connection
    // It only needs controller metadata and DTOs
    const config = new DocumentBuilder()
      .setTitle('Listings Service API')
      .setDescription('API for managing building listings')
      .setVersion('1.0')
      .addTag('buildings')
      .build();
    
    let document;
    try {
      document = SwaggerModule.createDocument(app, config);
    } catch (swaggerError: any) {
      // If Swagger generation fails due to database connection, 
      // it's likely because TypeORM is trying to connect during introspection
      // Swagger doesn't actually need the database - it only needs controller metadata
      if (swaggerError?.message?.includes('connect') || 
          swaggerError?.message?.includes('ECONNREFUSED') ||
          swaggerError?.code === 'ECONNREFUSED' ||
          swaggerError?.name === 'AggregateError') {
        console.log('⚠️  Swagger generation encountered DB connection issue (expected), continuing anyway...');
        // Try to create a minimal document - Swagger doesn't need DB connection
        // Wait a bit for any async operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          document = SwaggerModule.createDocument(app, config);
        } catch (retryError: any) {
          // If it still fails, log but try to continue
          console.log('⚠️  Swagger generation still failing, but this is expected without DB connection');
          // Check if it's a connection error (including AggregateError)
          const isRetryConnectionError = 
            retryError?.message?.includes('connect') || 
            retryError?.message?.includes('ECONNREFUSED') ||
            retryError?.code === 'ECONNREFUSED' ||
            retryError?.name === 'AggregateError' ||
            (retryError?.errors && Array.isArray(retryError.errors) && 
             retryError.errors.some((e: any) => e?.code === 'ECONNREFUSED'));
          
          if (isRetryConnectionError) {
            console.log('⚠️  Swagger generation still failing due to DB connection (expected), trying one more time...');
            // Wait longer and try one more time
            await new Promise(resolve => setTimeout(resolve, 2000));
            document = SwaggerModule.createDocument(app, config);
          } else {
            throw retryError;
          }
        }
      } else {
        throw swaggerError;
      }
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

