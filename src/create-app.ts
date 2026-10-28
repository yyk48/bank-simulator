import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { validationExceptionFactory } from './common/all-exceptions.filter.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Shared bootstrap keeps the HTTP adapter identical in runtime and HTTP tests.
export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 64 * 1024 }),
  );
  app.enableShutdownHooks();

  //CONFIGURING GLOBAL PIPES FOR VALIDATIONS
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  //CONFIGURING SWAGGER FOR API DOCUMENTATION
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Banking Simulator API')
      .setDescription('Synthetic banking simulator API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          description: 'Service API key issued to the calling application.',
        },
        'service-api-key',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  return app;
}
