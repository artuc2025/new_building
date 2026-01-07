import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generateOpenAPI() {
  // Track if we've seen a connection error
  let hasConnectionError = false;
  
  // Handle unhandled rejections to catch TypeORM connection errors
  const rejectionHandler = (reason: any) => {
    const isConnectionError = 
      reason?.message?.includes('connect') || 
      reason?.message?.includes('ECONNREFUSED') ||
      reason?.code === 'ECONNREFUSED' ||
      reason?.name === 'AggregateError' ||
      (reason?.errors && Array.isArray(reason.errors) && 
       reason.errors.some((e: any) => e?.code === 'ECONNREFUSED'));
    
    if (isConnectionError) {
      hasConnectionError = true;
      // Don't crash - we'll handle it
      console.log('⚠️  Caught database connection error (expected for generation)');
    }
  };
  
  process.on('unhandledRejection', rejectionHandler);
  
  try {
    // Set environment to skip DB connection for generation
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
      // Check if it's a connection error (including AggregateError)
      const isConnectionError = 
        createError?.message?.includes('connect') || 
        createError?.message?.includes('ECONNREFUSED') ||
        createError?.code === 'ECONNREFUSED' ||
        createError?.code === 'ENOTFOUND' ||
        createError?.name === 'ConnectionError' ||
        createError?.name === 'AggregateError' ||
        (createError?.errors && Array.isArray(createError.errors) && 
         createError.errors.some((e: any) => 
           e?.code === 'ECONNREFUSED' || 
           e?.message?.includes('connect') ||
           e?.message?.includes('ECONNREFUSED')
         ));
      
      if (isConnectionError) {
        console.log('⚠️  Database connection failed (expected for generation), continuing...');
        // The app might still be partially created, try to continue
        // TypeORM connection failure shouldn't prevent Swagger generation
        try {
          // Wait a bit for any async operations to settle
          await new Promise(resolve => setTimeout(resolve, 500));
          // Try creating the app again - sometimes it works on retry
          app = await NestFactory.create(AppModule, { 
            logger: false,
            abortOnError: false,
          });
        } catch (retryError: any) {
          // If retry also fails with connection error, that's fine
          // We'll try to proceed anyway since Swagger doesn't need DB
          const isRetryConnectionError = 
            retryError?.message?.includes('connect') || 
            retryError?.message?.includes('ECONNREFUSED') ||
            retryError?.code === 'ECONNREFUSED' ||
            retryError?.code === 'ENOTFOUND' ||
            retryError?.name === 'ConnectionError' ||
            retryError?.name === 'AggregateError' ||
            (retryError?.errors && Array.isArray(retryError.errors) && 
             retryError.errors.some((e: any) => 
               e?.code === 'ECONNREFUSED' || 
               e?.message?.includes('connect') ||
               e?.message?.includes('ECONNREFUSED')
             ));
          
          if (!isRetryConnectionError) {
            // If it's not a connection error, re-throw
            throw retryError;
          }
          // If it's still a connection error, log and try to continue
          // Swagger generation might still work even if TypeORM failed
          console.log('⚠️  Database connection still failing (expected), attempting to continue with Swagger generation...');
          // Try one more time with a longer delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            app = await NestFactory.create(AppModule, { 
              logger: false,
              abortOnError: false,
            });
          } catch (finalError: any) {
            // If it still fails, we can't create the app
            // This means TypeORM is blocking app creation
            console.error('❌ Unable to create NestJS app due to database connection error');
            console.error('TypeORM is preventing app initialization. This should not happen during OpenAPI generation.');
            throw new Error('App creation failed: TypeORM connection error during OpenAPI generation. Please ensure TypeORM can be skipped during generation.');
          }
        }
      } else {
        // If it's not a connection error, re-throw
        throw createError;
      }
    }
    
    // Ensure app was created successfully
    if (!app) {
      throw new Error('NestJS app was not created successfully');
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
    
    // Remove rejection handler
    process.removeListener('unhandledRejection', rejectionHandler);
    
    process.exit(0);
  } catch (error: any) {
    // Remove rejection handler
    process.removeListener('unhandledRejection', rejectionHandler);
    // Check if it's a connection error that we can ignore
    const isConnectionError = 
      error?.message?.includes('connect') || 
      error?.message?.includes('ECONNREFUSED') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ENOTFOUND' ||
      error?.name === 'ConnectionError' ||
      error?.name === 'AggregateError' ||
      (error?.errors && Array.isArray(error.errors) && 
      error.errors.some((e: any) => 
        e?.code === 'ECONNREFUSED' || 
        e?.message?.includes('connect') ||
        e?.message?.includes('ECONNREFUSED')
      ));
    
    if (isConnectionError) {
      console.error('❌ Error generating OpenAPI spec: Database connection failed');
      console.error('This is expected when generating OpenAPI without a database connection.');
      console.error('However, Swagger generation should not require a database.');
      console.error('Please check that TypeORM is properly configured to skip connection during OpenAPI generation.');
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

