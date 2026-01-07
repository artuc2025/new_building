import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const services = ['listings-service', 'api-gateway'];

console.log('📦 Starting review bundle process...\n');

let hasErrors = false;
const results: Record<string, { generate: boolean; validate: boolean; test: boolean }> = {};

// Step 1: Generate OpenAPI specs
console.log('Step 1: Generating OpenAPI specs...');
for (const service of services) {
  try {
    console.log(`  Generating ${service}...`);
    execSync(`pnpm nx run ${service}:openapi:generate`, { stdio: 'inherit' });
    results[service] = { generate: true, validate: false, test: false };
    console.log(`  ✅ ${service} OpenAPI spec generated\n`);
  } catch (error) {
    console.error(`  ❌ Failed to generate ${service} OpenAPI spec\n`);
    results[service] = { generate: false, validate: false, test: false };
    hasErrors = true;
  }
}

// Step 2: Validate OpenAPI specs
console.log('Step 2: Validating OpenAPI specs...');
for (const service of services) {
  if (!results[service]?.generate) {
    console.log(`  ⏭️  Skipping ${service} (generation failed)\n`);
    continue;
  }
  try {
    console.log(`  Validating ${service}...`);
    execSync(`pnpm nx run ${service}:openapi:validate`, { stdio: 'inherit' });
    results[service].validate = true;
    console.log(`  ✅ ${service} OpenAPI spec validated\n`);
  } catch (error) {
    console.error(`  ❌ Failed to validate ${service} OpenAPI spec\n`);
    results[service].validate = false;
    hasErrors = true;
  }
}

// Step 3: Run tests
console.log('Step 3: Running tests...');
for (const service of services) {
  try {
    console.log(`  Running tests for ${service}...`);
    execSync(`pnpm nx run ${service}:test`, { stdio: 'inherit' });
    results[service].test = true;
    console.log(`  ✅ ${service} tests passed\n`);
  } catch (error) {
    console.error(`  ❌ ${service} tests failed\n`);
    if (results[service]) {
      results[service].test = false;
    } else {
      results[service] = { generate: false, validate: false, test: false };
    }
    hasErrors = true;
  }
}

// Step 4: Generate summary
console.log('\n📊 Review Bundle Summary:');
console.log('='.repeat(60));
for (const service of services) {
  const result = results[service] || { generate: false, validate: false, test: false };
  const generateStatus = result.generate ? '✅' : '❌';
  const validateStatus = result.validate ? '✅' : '❌';
  const testStatus = result.test ? '✅' : '❌';
  
  console.log(`${service}:`);
  console.log(`  Generate: ${generateStatus}`);
  console.log(`  Validate:  ${validateStatus}`);
  console.log(`  Test:      ${testStatus}`);
  console.log('');
}

if (hasErrors) {
  console.log('❌ Review bundle completed with errors');
  process.exit(1);
} else {
  console.log('✅ Review bundle completed successfully');
  process.exit(0);
}

