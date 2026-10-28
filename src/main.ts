import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApp } from './create-app.js';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService);

  const port = config.getOrThrow<number>('PORT');
  const host = config.getOrThrow<string>('HOST');
  // Local-only scaffold defaults; validated configuration is the next increment.
  await app.listen(port, host);

  logger.log(`Bank simulator listening on ${await app.getUrl()}`);
}

bootstrap().catch((error: unknown) => {
  logger.error(
    'Application startup failed.',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
