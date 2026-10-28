import type { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { VaultClient } from '../vault/vault.client.js';
import { SERVICE_PERMISSIONS } from './service-access.types.js';
import type {
  ServiceClient,
  ServicePermission,
} from './service-access.types.js';
import { permission } from 'node:process';

export const SERVICE_CLIENTS = Symbol('SERVICE_CLIENTS');

interface ServiceClientProfile {
  readonly clientId: string;
  readonly enabled: boolean;
  readonly permissions: readonly ServicePermission[];
  readonly vaultPath: string;
}

const SERVICE_CLIENT_PROFILES: readonly ServiceClientProfile[] = [
  {
    clientId: 'trading-api',
    enabled: true,
    permissions: ['VERIFY_ACCOUNT', 'CREATE_TRANSFER', 'READ_TRANSFER'],
    vaultPath: 'banking/data/runtime/service-clients/trading-api',
  },
];

export async function loadServiceClients(
  config: ConfigService,
): Promise<readonly ServiceClient[]> {
  const clientIds = new Set<string>();

  for (const profile of SERVICE_CLIENT_PROFILES) {
    if (
      profile.clientId.trim().length === 0 ||
      clientIds.has(profile.clientId) ||
      typeof profile.enabled !== 'boolean' ||
      profile.permissions.some(
        (permission) => !SERVICE_PERMISSIONS.includes(permission),
      ) ||
      new Set(profile.permissions).size !== profile.permissions.length
    ) {
      throw new Error('Invalid service-client profile configuration.');
    }

    clientIds.add(profile.clientId);
  }

  const authDirectory = join(homedir(), 'bank-vault-local', 'runtime', 'auth');
  const [roleIdFile, secretIdFile] = await Promise.all([
    readFile(join(authDirectory, 'runtime-role-id'), 'utf8'),
    readFile(join(authDirectory, 'runtime-secret-id'), 'utf8'),
  ]);

  const roleId = roleIdFile.trim();
  const secretId = secretIdFile.trim();

  if (!roleId || !secretId) {
    throw new Error('Vault runtime AppRole credentials are empty.');
  }

  const vault = new VaultClient(
    config.getOrThrow<string>('VAULT_ADDR'),
    roleId,
    secretId,
  );

  const clients: ServiceClient[] = [];
  const credentialDigests = new Set<string>();

  for (const profile of SERVICE_CLIENT_PROFILES) {
    const secret = await vault.readKvV2(profile.vaultPath);
    const digest = secret['credentialDigest'];

    if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) {
      throw new Error(
        `Invalid credential digest for service client '${profile.clientId}'.`,
      );
    }
    if (credentialDigests.has(digest)) {
      throw new Error('Service clients must not share a credential digest.');
    }
    credentialDigests.add(digest);

    clients.push(
      Object.freeze({
        clientId: profile.clientId,
        enabled: profile.enabled,
        credentialDigestBuffer: Buffer.from(digest, 'hex'),
        permissions: Object.freeze([...profile.permissions]),
      }),
    );
  }
  return Object.freeze(clients);
}
