import { readFileSync } from 'fs';
import { join } from 'path';
import SwaggerParser from 'swagger-parser';

async function validateOpenAPI() {
  const specPath = join(__dirname, '..', 'openapi.json');
  
  try {
    const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
    await SwaggerParser.validate(spec);
    console.log('✓ OpenAPI spec is valid');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ OpenAPI spec validation failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

validateOpenAPI();

