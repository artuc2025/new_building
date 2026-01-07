import { execFileSync, execSync } from 'child_process';
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
  const dataSourcePath = 'src/data-source.ts'; // Relative to serviceRoot
  const migrationPath = `src/migrations/${migrationName}`; // Relative to serviceRoot, TypeORM will add timestamp

  // Resolve TypeORM CLI path (works with pnpm hoisting)
  let typeormCliPath: string;
  try {
    typeormCliPath = require.resolve('typeorm/cli');
  } catch {
    // Fallback to relative path if require.resolve fails
    typeormCliPath = resolve(serviceRoot, 'node_modules/typeorm/cli.js');
  }

  console.log(`Generating migration: ${migrationName}...`);
  console.log(`  DataSource: ${resolve(serviceRoot, dataSourcePath)}`);
  console.log(`  Migrations folder: ${resolve(serviceRoot, 'src/migrations')}`);

  // Use TypeORM CLI via tsx to handle TypeScript DataSource import
  // TypeORM will automatically add timestamp prefix to the migration file
  // Use execSync with shell on Windows to find pnpm in PATH, execFileSync on Unix
  const isWindows = process.platform === 'win32';
  const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';
  const args = ['exec', 'tsx', typeormCliPath, 'migration:generate', '-d', dataSourcePath, migrationPath];
  
  if (isWindows) {
    // On Windows, use execSync with shell to find pnpm.cmd in PATH
    execSync(`${pnpmCmd} ${args.map(arg => `"${arg}"`).join(' ')}`, {
      cwd: serviceRoot,
      stdio: 'inherit',
      env: { ...process.env },
      shell: true,
    });
  } else {
    // On Unix, use execFileSync to avoid shell quoting issues
    execFileSync(pnpmCmd, args, {
      cwd: serviceRoot,
      stdio: 'inherit',
      env: { ...process.env },
    });
  }

  console.log(`✅ Migration generated successfully`);
} catch (error) {
  console.error('❌ Error generating migration:', error);
  process.exit(1);
}

