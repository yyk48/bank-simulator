import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // Liveness only: database readiness will be introduced with persistence.
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
