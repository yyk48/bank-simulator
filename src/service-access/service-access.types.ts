import type { FastifyRequest } from 'fastify';

export interface ServicePrincipal {
  readonly clientId: string;
  readonly permissions: readonly ServicePermission[];
}

export type ServiceAuthenticatedRequest = FastifyRequest & {
  servicePrincipal?: ServicePrincipal;
};

export const SERVICE_PERMISSIONS = [
  'LIST_BANKS',
  'VERIFY_ACCOUNT',
  'READ_ACCOUNT',
  'CREATE_TRANSFER',
  'READ_TRANSFER',
] as const;

export type ServicePermission = (typeof SERVICE_PERMISSIONS)[number];

// Private startup configuration. Never send this in an API response.
export interface ServiceClient {
  readonly clientId: string;
  readonly enabled: boolean;
  readonly credentialDigestBuffer: Buffer;
  readonly permissions: readonly ServicePermission[];
}
