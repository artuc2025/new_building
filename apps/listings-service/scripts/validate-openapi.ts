import { readFileSync } from 'fs';
import { join } from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';

async function validateOpenAPI() {
  try {
    const specPath = join(__dirname, '..', 'openapi.json');
    
    // Check if file exists
    try {
      readFileSync(specPath, 'utf-8');
    } catch (error) {
      console.error(`❌ Error: openapi.json not found at ${specPath}`);
      console.error('   Run openapi:generate first to create the spec file.');
      process.exit(1);
    }
    
    console.log(`Validating OpenAPI spec: ${specPath}`);
    
    // Validate and dereference the spec
    const api = await SwaggerParser.validate(specPath);
    
    console.log(`✅ OpenAPI spec is valid`);
    console.log(`   Title: ${api.info?.title || 'N/A'}`);
    console.log(`   Version: ${api.info?.version || 'N/A'}`);
    console.log(`   Paths: ${Object.keys(api.paths || {}).length}`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ OpenAPI validation failed:');
    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2));
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  }
}

validateOpenAPI();

