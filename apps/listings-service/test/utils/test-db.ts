import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { join } from 'path';

let container: StartedPostgreSqlContainer | null = null;

export async function startTestDatabase(): Promise<StartedPostgreSqlContainer> {
  if (container) {
    return container;
  }

  // Start PostGIS container
  container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .withReuse()
    .start();

  const connectionUrl = container.getConnectionUri();

  // Set environment variable for database URL
  process.env.DATABASE_URL = connectionUrl;
  process.env.DATABASE_URL_LISTINGS = connectionUrl;

  // Run migrations using the migrate target
  const projectRoot = join(__dirname, '../..');
  try {
    execSync('pnpm nx run listings-service:migrate', {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_URL: connectionUrl,
        DATABASE_URL_LISTINGS: connectionUrl,
      },
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  return container;
}

export async function stopTestDatabase(): Promise<void> {
  if (container) {
    await container.stop();
    container = null;
  }
}

export function getDatabaseUrl(): string {
  if (!container) {
    throw new Error('Database container not started. Call startTestDatabase() first.');
  }
  return container.getConnectionUri();
}

