// Ensure reflect-metadata is loaded first, before any other imports
import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { PaginatedBuildingsResponseDto, BuildingEnvelopeDto, BuildingResponseDto, PaginationMetaDto, ResponseMetaDto } from '@new-building-portal/contracts';

async function generateOpenAPI() {
  try {
    // Set environment variables for generation (mock service URLs)
    const originalListingsUrl = process.env.LISTINGS_SERVICE_URL;
    const originalAdminKey = process.env.ADMIN_API_KEY;
    
    process.env.LISTINGS_SERVICE_URL = 'http://localhost:3001';
    process.env.ADMIN_API_KEY = 'dummy-key-for-generation';
    // Disable logging to reduce noise
    process.env.NODE_ENV = 'production';
    
    // Use Test.createTestingModule to avoid external dependencies
    // This approach compiles the module without initializing connections
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    // Create NestJS application from compiled module
    const app = moduleRef.createNestApplication();
    
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
    
    // Create document with options to ensure all DTO schemas are included
    // extraModels ensures referenced DTOs are included in components.schemas
    const document = SwaggerModule.createDocument(app, config, {
      ignoreGlobalPrefix: false,
      deepScanRoutes: true,
      extraModels: [
        PaginatedBuildingsResponseDto,
        BuildingEnvelopeDto,
        BuildingResponseDto,
        PaginationMetaDto,
        ResponseMetaDto,
      ],
    });
    
    // Write to openapi.json in service root
    const outputPath = join(__dirname, '..', 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    
    console.log(`✅ OpenAPI spec generated: ${outputPath}`);
    
    // Always close the app
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

