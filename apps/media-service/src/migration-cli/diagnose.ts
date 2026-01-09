import { AppDataSource } from '../data-source';

AppDataSource.initialize()
  .then(async () => {
    console.log('🔍 DataSource Diagnostics for media-service\n');

    // Print entity metadata count
    const entityCount = AppDataSource.entityMetadatas.length;
    console.log(`Entities loaded: ${entityCount}`);
    if (entityCount > 0) {
      console.log('  Entity names:', AppDataSource.entityMetadatas.map((e) => e.name).join(', '));
    }

    // Print migration count
    const migrationCount = AppDataSource.migrations.length;
    console.log(`\nMigrations configured: ${migrationCount}`);
    if (migrationCount > 0) {
      console.log('  Migration names:', AppDataSource.migrations.map((m) => m.name).join(', '));
    }

    // Print resolved globs (if available)
    const options = AppDataSource.options;
    console.log(`\nEntity globs: ${Array.isArray(options.entities) ? options.entities.join(', ') : 'N/A'}`);
    console.log(`Migration globs: ${Array.isArray(options.migrations) ? options.migrations.join(', ') : 'N/A'}`);
    console.log(`Schema: ${(options as any).schema || 'default'}`);

    await AppDataSource.destroy();
    console.log('\n✅ Diagnostics completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error running diagnostics:', error);
    process.exit(1);
  });

