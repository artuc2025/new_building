import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

/**
 * Recursively sort object keys to ensure deterministic JSON output
 */
function sortKeysRecursively(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sortKeysRecursively(item));
  }
  
  if (typeof obj === 'object') {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = sortKeysRecursively(obj[key]);
    }
    return sorted;
  }
  
  return obj;
}

async function generateOpenAPI() {
  const app = await NestFactory.create(AppModule, { logger: false });
  
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
  
  const document = SwaggerModule.createDocument(app, config);
  
  // Sort keys recursively for deterministic output
  const sortedDocument = sortKeysRecursively(document);
  
  // Write to openapi.json
  const outputPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(sortedDocument, null, 2), 'utf-8');
  
  console.log(`OpenAPI spec generated: ${outputPath}`);
  
  await app.close();
  process.exit(0);
}

generateOpenAPI().catch((error) => {
  console.error('Failed to generate OpenAPI spec:', error);
  process.exit(1);
});

