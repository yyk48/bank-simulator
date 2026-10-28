import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { DataSource } from 'typeorm';
import { BANKS } from '../bank-code.js';
import { createBankDataSourceOptions } from '../bank-data-source.options.js';
import { Branch } from '../../banking/entities/branch.entity.js';
import { AccountHolder } from '../../banking/entities/account-holder.entity.js';
import { BankAccount } from '../../banking/entities/bank-account.entity.js';
import { validateSeedData } from './seed.validation.js';
import { SeedRepository } from './seed.repository.js';
import { SeedError } from './seed.types.js';

async function main(): Promise<void> {
  const bank = BANKS.find(
    (candidate) => candidate === process.env['SEED_BANK'],
  );
  if (bank === undefined)
    throw new SeedError('Set SEED_BANK to icici, hdfc or sbi.');
  if (process.env['ALLOW_SIMULATOR_SEED'] !== 'true') {
    throw new SeedError(
      'Set ALLOW_SIMULATOR_SEED=true for the intended simulator database.',
    );
  }
  // The bank is from a closed allowlist; arbitrary paths cannot enter this URL.
  let input: unknown;
  try {
    input = JSON.parse(
      await readFile(new URL(`./data/${bank}.json`, import.meta.url), 'utf8'),
    );
  } catch {
    throw new SeedError(
      'Cannot read seed JSON. Build and copy seed assets first.',
    );
  }
  const data = await validateSeedData(input, bank);
  let source: DataSource;
  try {
    const options = await createBankDataSourceOptions(bank, 'migrator');
    if (options.type !== 'postgres') {
      throw new SeedError('The seed runner requires PostgreSQL.');
    }
    source = new DataSource({
      ...options,
      // Explicit classes also check that our ESM entities load successfully.
      entities: [Branch, AccountHolder, BankAccount],
      migrations: [],
      synchronize: false,
      migrationsRun: false,
      applicationName: `bank-simulator:${bank}:seed`,
    });
  } catch {
    throw new SeedError(
      'Invalid database configuration; check host, port and selected migration password.',
    );
  }
  try {
    await source.initialize();
    const identity: unknown = await source.query(
      'SELECT current_database() AS database, current_user AS username',
    );
    if (!Array.isArray(identity) || identity.length !== 1)
      throw new SeedError('Cannot verify the target database.');
    const row: unknown = identity[0];
    if (
      typeof row !== 'object' ||
      row === null ||
      !('database' in row) ||
      row.database !== `${bank}_bank` ||
      !('username' in row) ||
      row.username !== `${bank}_migrator`
    ) {
      throw new SeedError(
        'Connected database or user does not match the selected bank migrator.',
      );
    }
    const inserted = await source.transaction((manager) =>
      new SeedRepository(manager).insertMissing(data),
    );
    console.info(
      `${bank}: committed seed; inserted ${inserted.branches} branches, ${inserted.accountHolders} holders, ${inserted.bankAccounts} accounts.`,
    );
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

main().catch((error: unknown) => {
  if (error instanceof SeedError) {
    console.error(error.message);
  } else {
    // Do not print connection options, SQL parameters or driver error objects.
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      /^[A-Z0-9_]{1,30}$/.test(error.code)
        ? error.code
        : 'UNKNOWN';
    console.error(
      `Seed failed (${code}). Check database availability, migrations, permissions and fixture conflicts.`,
    );
  }
  process.exitCode = 1;
});
