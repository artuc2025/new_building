import { AppDataSource } from '../data-source';

const migrationName = process.argv.find((arg) => arg.startsWith('--name='))?.split('=')[1];

if (!migrationName) {
  console.error('Usage: tsx generate.ts --name=MigrationName');
  process.exit(1);
}

AppDataSource.initialize()
  .then(async () => {
    console.log(`Generating migration: ${migrationName}...`);
    console.log('Note: Manual migration creation is required. Use migration:generate target to scaffold.');
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

