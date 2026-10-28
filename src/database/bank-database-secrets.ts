import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

import type { Bank } from './bank-code.js';
import { VaultClient } from '../vault/vault.client.js';

export type DatabasePurpose = 'app' | 'migrator';

export interface BankDatabaseSecret {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

const clients = new Map<DatabasePurpose, Promise<VaultClient>>();

async function readCredential(path: string): Promise<string> {
  const value = (await readFile(path, 'utf8')).trim();

  if (value.length === 0) {
    throw new Error('Vault AppRole credential file is empty.');
  }

  return value;
}

function authPaths(purpose: DatabasePurpose): {
  roleId: string;
  secretId: string;
} {
  const base =
    purpose === 'app'
      ? join(homedir(), 'bank-vault-local/runtime/auth')
      : join(homedir(), 'bank-vault-local/migration/auth');

  return purpose === 'app'
    ? {
        roleId: join(base, 'runtime-role-id'),
        secretId: join(base, 'runtime-secret-id'),
      }
    : {
        roleId: join(base, 'migration-role-id'),
        secretId: join(base, 'migration-secret-id'),
      };
}

async function createClient(purpose: DatabasePurpose): Promise<VaultClient> {
  const paths = authPaths(purpose);

  const [roleId, secretId] = await Promise.all([
    readCredential(paths.roleId),
    readCredential(paths.secretId),
  ]);

  const address = process.env['VAULT_ADDR']?.trim() || 'http://127.0.0.1:8200';

  return new VaultClient(address, roleId, secretId);
}

function clientFor(purpose: DatabasePurpose): Promise<VaultClient> {
  const existing = clients.get(purpose);

  if (existing !== undefined) {
    return existing;
  }

  const created = createClient(purpose);
  clients.set(purpose, created);

  return created;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Vault database secret '${field}' is invalid.`);
  }

  return value.trim();
}

function databasePort(value: unknown): number {
  const port =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Vault database secret port is invalid.');
  }

  return port;
}

export async function loadBankDatabaseSecret(
  bank: Bank,
  purpose: DatabasePurpose,
): Promise<BankDatabaseSecret> {
  const client = await clientFor(purpose);

  const scope = purpose === 'app' ? 'runtime' : 'migration';

  const value = await client.readKvV2(`banking/data/${scope}/db/${bank}`);

  const database = requiredString(value['database'], 'database');

  const username = requiredString(value['username'], 'username');

  const expectedDatabase = `${bank}_bank`;
  const expectedUsername = `${bank}_${purpose}`;

  if (database !== expectedDatabase) {
    throw new Error('Vault database name does not match the selected bank.');
  }

  if (username !== expectedUsername) {
    throw new Error(
      'Vault database username does not match the selected purpose.',
    );
  }

  return {
    host: requiredString(value['host'], 'host'),
    port: databasePort(value['port']),
    database,
    username,
    password: requiredString(value['password'], 'password'),
  };
}
