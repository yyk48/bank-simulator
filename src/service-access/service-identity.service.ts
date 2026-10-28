import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

import { SERVICE_CLIENTS } from './service-clients.config.js';
import type {
  ServiceClient,
  ServicePrincipal,
} from './service-access.types.js';

@Injectable()
export class ServiceIdentityService {
  constructor(
    @Inject(SERVICE_CLIENTS)
    private readonly clients: readonly ServiceClient[],
  ) {}

  authenticate(rawHeaders: readonly string[]): ServicePrincipal {
    const token = this.extractToken(rawHeaders);

    // Hash the exact issued string, matching the key-generation command.
    const suppliedDigest = createHash('sha256').update(token, 'utf8').digest();

    let matched: ServiceClient | undefined;

    for (const client of this.clients) {
      // Startup validation guarantees every stored digest is 32 bytes.
      const matches = timingSafeEqual(
        suppliedDigest,
        client.credentialDigestBuffer,
      );

      if (matches && client.enabled) {
        matched = client;
      }
    }

    if (matched === undefined) {
      this.reject();
    }

    return Object.freeze({
      clientId: matched.clientId,
      permissions: Object.freeze([...matched.permissions]),
    });
  }

  private extractToken(rawHeaders: readonly string[]): string {
    let authorization: string | undefined;
    let count = 0;

    // Raw headers preserve duplicate Authorization entries.
    for (let index = 0; index < rawHeaders.length; index += 2) {
      if (rawHeaders[index]?.toLowerCase() === 'authorization') {
        count += 1;
        authorization = rawHeaders[index + 1];
      }
    }

    if (count !== 1 || authorization === undefined) {
      this.reject();
    }

    // The scheme is case-insensitive; the token itself is case-sensitive.
    const match = /^Bearer +(\S+)$/i.exec(authorization);
    const token = match?.[1];

    if (token === undefined || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      this.reject();
    }

    const decoded = Buffer.from(token, 'base64url');

    if (decoded.length !== 32 || decoded.toString('base64url') !== token) {
      this.reject();
    }

    return token;
  }

  private reject(): never {
    throw new UnauthorizedException({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required.',
    });
  }
}
