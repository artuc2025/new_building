import { AppDataSource } from '../data-source';

AppDataSource.initialize()
  .then(async () => {
    console.log('Reverting last migration...');
    await AppDataSource.undoLastMigration();
    console.log('Migration reverted successfully');
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error reverting migration:', error);
    process.exit(1);
  });

