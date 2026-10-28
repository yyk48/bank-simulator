import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { BANK_CODES } from '../../database/bank-code.js';
import { AccountVerificationDto } from '../dtos/account-verification.dto.js';

function publicErrorSchema() {
  return {
    type: 'object' as const,
    required: ['statusCode', 'code', 'message'],
    properties: {
      statusCode: {
        type: 'integer' as const,
        example: 400,
      },
      code: {
        type: 'string' as const,
        example: 'VALIDATION_ERROR',
      },
      message: {
        type: 'string' as const,
        example: 'Request validation failed.',
      },
    },
  };
}

export function ApiBankingControllerDocs() {
  return applyDecorators(ApiTags('Banking'));
}

export function ApiServiceAccessDocs() {
  return applyDecorators(
    ApiBearerAuth('service-api-key'),

    ApiUnauthorizedResponse({
      description: 'Missing, malformed, unknown or disabled service key.',
      headers: {
        'WWW-Authenticate': {
          description: 'Bearer authentication challenge.',
          schema: {
            type: 'string',
            example: 'Bearer realm="banking-simulator"',
          },
        },
      },
      schema: {
        type: 'object',
        required: ['statusCode', 'code', 'message'],
        properties: {
          statusCode: { type: 'integer', example: 401 },
          code: { type: 'string', example: 'UNAUTHENTICATED' },
          message: {
            type: 'string',
            example: 'Authentication required.',
          },
        },
      },
    }),

    ApiForbiddenResponse({
      description: 'The service lacks the required operation permission.',
      schema: {
        type: 'object',
        required: ['statusCode', 'code', 'message'],
        properties: {
          statusCode: { type: 'integer', example: 403 },
          code: { type: 'string', example: 'FORBIDDEN' },
          message: {
            type: 'string',
            example: 'Operation not permitted.',
          },
        },
      },
    }),
  );
}

export function ApiVerifyAccountDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify a bank account',
      description:
        'Verifies that an account exists at the selected simulated bank and that the supplied IFSC and owner tax identifier match the bank record.',
    }),

    ApiParam({
      name: 'bank',
      description: 'Simulated bank to verify the account against.',
      enum: BANK_CODES,
      example: 'ICICI',
    }),

    ApiBody({
      type: AccountVerificationDto,
    }),

    ApiOkResponse({
      description:
        'Verification completed. Business verification failures are returned with verified=false.',
      headers: {
        'Cache-Control': {
          description: 'Account-verification responses must not be cached.',
          schema: {
            type: 'string',
            example: 'no-store',
          },
        },
      },
      schema: {
        oneOf: [
          {
            type: 'object',
            required: [
              'verified',
              'accountHolderName',
              'accountReference',
              'bank',
              'currency',
              'status',
            ],
            properties: {
              verified: {
                type: 'boolean',
                enum: [true],
                example: true,
              },
              accountHolderName: {
                type: 'string',
                example: 'Ravi Kumar',
              },
              accountReference: {
                type: 'string',
                format: 'uuid',
                example: '7a7cb274-2d31-4a84-9bc7-9df4f6bb7351',
              },
              bank: {
                type: 'string',
                enum: BANK_CODES,
                example: 'ICICI',
              },
              currency: {
                type: 'string',
                example: 'INR',
              },
              status: {
                type: 'string',
                enum: ['ACTIVE'],
                example: 'ACTIVE',
              },
            },
          },
          {
            type: 'object',
            required: ['verified', 'reason'],
            properties: {
              verified: {
                type: 'boolean',
                enum: [false],
                example: false,
              },
              reason: {
                type: 'string',
                enum: [
                  'ACCOUNT_NOT_FOUND',
                  'IFSC_MISMATCH',
                  'OWNER_MISMATCH',
                  'INACTIVE',
                  'FROZEN',
                ],
                example: 'OWNER_MISMATCH',
              },
            },
          },
        ],
      },
    }),

    ApiBadRequestResponse({
      description:
        'DTO validation failed or the IFSC does not belong to the selected bank.',
      schema: publicErrorSchema(),
    }),

    ApiServiceUnavailableResponse({
      description: 'The selected simulated bank is temporarily unavailable.',
      schema: {
        ...publicErrorSchema(),
        properties: {
          statusCode: {
            type: 'integer',
            example: 503,
          },
          code: {
            type: 'string',
            enum: ['BANK_UNAVAILABLE', 'TEMPORARILY_UNAVAILABLE'],
            example: 'BANK_UNAVAILABLE',
          },
          message: {
            type: 'string',
            example: 'The selected bank is temporarily unavailable.',
          },
        },
      },
    }),

    ApiInternalServerErrorResponse({
      description: 'Unexpected internal server error.',
      schema: {
        ...publicErrorSchema(),
        properties: {
          statusCode: {
            type: 'integer',
            example: 500,
          },
          code: {
            type: 'string',
            example: 'INTERNAL_ERROR',
          },
          message: {
            type: 'string',
            example: 'Internal server error',
          },
        },
      },
    }),
  );
}
