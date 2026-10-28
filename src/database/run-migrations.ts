import type { DataSource } from 'typeorm';

import { refreshSchemaHistory } from './bank-schema.js';

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== 'run' && command !== 'revert' && command !== 'refresh') {
    throw new Error('Expected run, revert or refresh.');
  }

  // Dynamic import keeps Vault/configuration failures inside
  // the top-level error handler.
  const { default: source } = await import('./migration-data-source.js');

  await execute(source, command);
}

async function execute(
  source: DataSource,
  command: 'run' | 'revert' | 'refresh',
): Promise<void> {
  try {
    await source.initialize();

    if (command === 'run') {
      await source.runMigrations({ transaction: 'all' });
    } else if (command === 'revert') {
      await source.undoLastMigration({ transaction: 'all' });
    }

    // runMigrations/undoLastMigration have completed their
    // transactions before execution reaches this point.
    try {
      await refreshSchemaHistory(source, command === 'revert');
    } catch {
      throw new Error(
        command === 'refresh'
          ? 'Schema-history refresh failed.'
          : 'Migration operation completed, but schema-history refresh ' +
              'failed. Do not start the application; retry db:schema:refresh.',
      );
    }

    console.info(
      command === 'revert'
        ? 'Revert completed; schema history refreshed if present.'
        : 'Schema history refreshed successfully.',
    );
  } finally {
    if (source.isInitialized) {
      await source.destroy();
    }
  }
}

try {
  await main();
} catch (error: unknown) {
  // Avoid printing raw database/Vault errors or credentials.
  const message =
    error instanceof Error &&
    (error.message.startsWith('Schema-history refresh failed') ||
      error.message.startsWith('Migration operation completed') ||
      error.message === 'Expected run, revert or refresh.')
      ? error.message
      : 'Migration command failed. Check database and Vault configuration.';

  console.error(message);
  process.exitCode = 1;
}
