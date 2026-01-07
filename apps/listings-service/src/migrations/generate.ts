import { AppDataSource } from '../data-source';
import { execSync } from 'child_process';

const migrationName = process.argv.find((arg) => arg.startsWith('--name='))?.split('=')[1];

if (!migrationName) {
  console.error('Usage: tsx generate.ts --name=MigrationName');
  process.exit(1);
}

AppDataSource.initialize()
  .then(async () => {
    console.log(`Generating migration: ${migrationName}...`);
    // TypeORM CLI would be used here, but for now we'll create manual migrations
    console.log('Note: Manual migration creation is required. Use migration:generate target to scaffold.');
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

