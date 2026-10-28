import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  loadServiceClients,
  SERVICE_CLIENTS,
} from './service-clients.config.js';
import { ServiceIdentityService } from './service-identity.service.js';
import { ServicePermissionService } from './service-permission.service.js';
import { ServiceAuthenticationGuard } from './service-authentication.guard.js';
import { ServiceAuthorizationGuard } from './service-authorization.guard.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SERVICE_CLIENTS,
      inject: [ConfigService],
      useFactory: loadServiceClients,
    },
    ServiceIdentityService,
    ServicePermissionService,
    ServiceAuthenticationGuard,
    ServiceAuthorizationGuard,
  ],
  exports: [
    ServiceIdentityService,
    ServicePermissionService,
    ServiceAuthenticationGuard,
    ServiceAuthorizationGuard,
  ],
})
export class ServiceAccessModule {}
