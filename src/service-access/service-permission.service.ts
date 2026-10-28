import { ForbiddenException, Injectable } from '@nestjs/common';
import { SERVICE_PERMISSIONS } from './service-access.types.js';
import type { ServicePrincipal } from './service-access.types.js';

@Injectable()
export class ServicePermissionService {
  assertAllowed(
    principal: ServicePrincipal,
    requiredPermission: unknown,
  ): void {
    const isKnownPermission = SERVICE_PERMISSIONS.some(
      (permission) => permission === requiredPermission,
    );

    const isGranted = principal.permissions.some(
      (permission) => permission === requiredPermission,
    );

    if (!isKnownPermission || !isGranted) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Operation not permitted.',
      });
    }
  }
}
