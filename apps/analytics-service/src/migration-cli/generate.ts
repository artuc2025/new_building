import { execSync } from 'child_process';
import { resolve } from 'path';

// Parse --name argument (supports both --name=Value and --name Value formats)
let migrationName: string | undefined;
const nameArgIndex = process.argv.findIndex((arg) => arg.startsWith('--name'));
if (nameArgIndex !== -1) {
  const nameArg = process.argv[nameArgIndex];
  if (nameArg.includes('=')) {
    migrationName = nameArg.split('=')[1];
  } else if (process.argv[nameArgIndex + 1]) {
    migrationName = process.argv[nameArgIndex + 1];
  }
}

if (!migrationName) {
  console.error('Error: --name argument is required');
  console.error('Usage: tsx generate.ts --name=MigrationName');
  process.exit(1);
}

// Validate migration name (alphanumeric and underscores only)
if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(migrationName)) {
  console.error('Error: Migration name must start with a letter and contain only letters, numbers, and underscores');
  process.exit(1);
}

try {
  const serviceRoot = resolve(__dirname, '../..');
  const dataSourcePath = resolve(serviceRoot, 'src/data-source.ts');
  const migrationsPath = resolve(serviceRoot, 'src/migrations');

  console.log(`Generating migration: ${migrationName}...`);
  console.log(`  DataSource: ${dataSourcePath}`);
  console.log(`  Migrations folder: ${migrationsPath}`);

  // Use TypeORM CLI to generate migration
  // TypeORM will automatically add timestamp prefix to the migration file
  const migrationPath = `${migrationsPath}/${migrationName}`;
  const command = `pnpm exec typeorm migration:generate -d ${dataSourcePath} ${migrationPath}`;
  
  execSync(command, {
    cwd: serviceRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log(`✅ Migration generated successfully`);
} catch (error) {
  console.error('❌ Error generating migration:', error);
  process.exit(1);
}

