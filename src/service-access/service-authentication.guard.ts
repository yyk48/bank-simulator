import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { ServiceIdentityService } from './service-identity.service.js';
import type { ServiceAuthenticatedRequest } from './service-access.types.js';

@Injectable()
export class ServiceAuthenticationGuard implements CanActivate {
  constructor(private readonly identityService: ServiceIdentityService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<ServiceAuthenticatedRequest>();

    try {
      request.servicePrincipal = this.identityService.authenticate(
        request.raw.rawHeaders,
      );

      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        const reply = http.getResponse<FastifyReply>();

        reply.header('WWW-Authenticate', 'Bearer realm="banking-simulator"');
      }

      throw error;
    }
  }
}
