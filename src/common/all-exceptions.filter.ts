import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PublicHttpException } from './public-http.exceptions.js';
import type { ValidationError } from 'class-validator';

/**
 * Centralizes HTTP error Responses
 * Preserves expected client errors and hides internal failure details.
 */

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    if (reply.sent) return;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.logger.error(
        {
          message: 'HTTP request failed.',
          statusCode: status,
          requestId: request.id,
          method: request.method,
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const canExpose =
      exception instanceof PublicHttpException ||
      (exception instanceof HttpException && status < 500);

    const body = canExpose
      ? exception.getResponse()
      : {
          statusCode: status,
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        };

    const response =
      typeof body === 'string' ? { statusCode: status, message: body } : body;

    void reply.status(status).send(response);
  }
}

export function validationExceptionFactory(
  errors: ValidationError[],
): PublicHttpException {
  function messages(error: ValidationError): string[] {
    return [
      ...Object.values(error.constraints ?? {}),
      ...(error.children ?? []).flatMap(messages),
    ];
  }

  return new PublicHttpException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_ERROR',
    errors.flatMap(messages).join('; ') || 'Request Validation Failed.',
  );
}
