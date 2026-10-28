import { SetMetadata } from '@nestjs/common';

import type { ServicePermission } from './service-access.types.js';

export const SERVICE_PERMISSION_METADATA = 'service-access:permission';

export const RequireServicePermission = (permission: ServicePermission) =>
  SetMetadata(SERVICE_PERMISSION_METADATA, permission);
