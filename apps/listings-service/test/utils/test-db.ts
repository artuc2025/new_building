import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

let container: StartedPostgreSqlContainer | null = null;
let testDataSource: DataSource | null = null;

export async function setupTestDatabase(): Promise<DataSource> {
  if (container && testDataSource) {
    return testDataSource;
  }

  // Start PostgreSQL container
  container = await new PostgreSqlContainer('postgis/postgis:15-3.3')
    .withDatabase('test_listings')
    .withUsername('test')
    .withPassword('test')
    .start();

  // Create DataSource with test container connection
  const projectRoot = __dirname + '/../../';
  testDataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    schema: 'listings',
    synchronize: false,
    logging: false,
    entities: [projectRoot + 'src/entities/**/*.entity{.ts,.js}'],
    migrations: [projectRoot + 'src/migrations/*{.ts,.js}'],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false,
  });

  await testDataSource.initialize();

  // Create schema
  const queryRunner = testDataSource.createQueryRunner();
  try {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS listings;`);
  } finally {
    await queryRunner.release();
  }

  // Run migrations
  await testDataSource.runMigrations();

  return testDataSource;
}

export async function teardownTestDatabase(): Promise<void> {
  if (testDataSource) {
    await testDataSource.destroy();
    testDataSource = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
}

export async function clearDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE listings.${entity.tableName} CASCADE;`);
  }
}

