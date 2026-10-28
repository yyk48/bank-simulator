// import { fileURLToPath } from 'node:url';

// import type { ConfigService } from '@nestjs/config';
// import type { DataSourceOptions } from 'typeorm';

// import type { Bank } from './bank-code.js';

// type DatabasePurpose = 'app' | 'migrator';

// function requiredString(config: ConfigService, key: string): string {
//   const value = config.getOrThrow<unknown>(key);

//   if (
//     typeof value !== 'string' ||
//     value.length === 0 ||
//     value.trim().length === 0
//   ) {
//     throw new Error(`${key} must be a non-empty string.`);
//   }

//   return value;
// }

// function databasePort(config: ConfigService): number {
//   const value = config.getOrThrow<unknown>('DB_PORT');

//   const port =
//     typeof value === 'number' || typeof value === 'string'
//       ? Number(value)
//       : Number.NaN;

//   if (!Number.isInteger(port) || port < 1 || port > 65535) {
//     throw new Error('DB_PORT Must be an integer between 1 and 65535.');
//   }

//   return port;
// }

// /**
//  * Factory pattern:
//  * Builds shared PostgreSQL options for a selected bank and purpose.
//  * Application requests and migrations use different database credentials.
//  */

// export function createBankDataSourceOptions(
//   config: ConfigService,
//   bank: Bank,
//   purpose: DatabasePurpose,
// ): DataSourceOptions {
//   const passwordKey =
//     purpose === 'app'
//       ? `${bank.toUpperCase()}_DB_PASSWORD`
//       : `${bank.toUpperCase()}_DB_MIGRATION_PASSWORD`;
//   return {
//     type: 'postgres',

//     host: requiredString(config, 'DB_HOST'),
//     port: databasePort(config),

//     database: `${bank}_bank`,
//     username: `${bank}_${purpose}`,
//     password: requiredString(config, passwordKey),

//     applicationName: `bank-simulator:${bank}:${purpose}`,

//     schema: 'public',

//     entities: [fileURLToPath(new URL('../**/*.entity.js', import.meta.url))],

//     migrations: [fileURLToPath(new URL('./migrations/*.js', import.meta.url))],

//     synchronize: false,
//     migrationsRun: false,

//     migrationsTableName: 'typeorm_migrations',
//     migrationsTransactionMode: 'all',

//     connectTimeoutMS: 5_000,
//     extra: {
//       min: purpose === 'app' ? 1 : 0,
//     },
//     logging: false,
//   };
// }

import { fileURLToPath } from 'node:url';
import type { DataSourceOptions } from 'typeorm';

import type { Bank } from './bank-code.js';
import {
  loadBankDatabaseSecret,
  type DatabasePurpose,
} from './bank-database-secrets.js';

export async function createBankDataSourceOptions(
  bank: Bank,
  purpose: DatabasePurpose,
): Promise<DataSourceOptions> {
  const secret = await loadBankDatabaseSecret(bank, purpose);

  return {
    type: 'postgres',

    host: secret.host,
    port: secret.port,
    database: secret.database,
    username: secret.username,
    password: secret.password,

    applicationName: `bank-simulator:${bank}:${purpose}`,

    schema: 'public',

    entities: [fileURLToPath(new URL('../**/*.entity.js', import.meta.url))],

    migrations: [fileURLToPath(new URL('./migrations/*.js', import.meta.url))],

    synchronize: false,
    migrationsRun: false,
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'all',
    connectTimeoutMS: 5_000,
    logging: false,
  };
}
