import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generateOpenAPI() {
  try {
    // Create NestJS app instance
    const app = await NestFactory.create(AppModule, { logger: false });
    
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
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating OpenAPI spec:', error);
    process.exit(1);
  }
}

generateOpenAPI();

