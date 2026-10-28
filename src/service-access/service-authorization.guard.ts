import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply } from 'fastify';

import { SERVICE_PERMISSION_METADATA } from './require-service-permission.decorator.js';
import { ServicePermissionService } from './service-permission.service.js';
import type { ServiceAuthenticatedRequest } from './service-access.types.js';

@Injectable()
export class ServiceAuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: ServicePermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<ServiceAuthenticatedRequest>();

    const principal = request.servicePrincipal;

    // Fail closed if authentication was not applied correctly.
    if (principal === undefined) {
      http
        .getResponse<FastifyReply>()
        .header('www-authenticate', 'Bearer realm="banking-simulator"');

      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required.',
      });
    }

    const requiredPermission = this.reflector.getAllAndOverride<unknown>(
      SERVICE_PERMISSION_METADATA,
      [context.getHandler(), context.getClass()],
    );

    this.permissionService.assertAllowed(principal, requiredPermission);

    return true;
  }
}
