import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BankingService } from './banking.service.js';

import { ServiceAuthenticationGuard } from '../service-access/service-authentication.guard.js';
import { ServiceAuthorizationGuard } from '../service-access/service-authorization.guard.js';
import { RequireServicePermission } from '../service-access/require-service-permission.decorator.js';
import {
  ApiBankingControllerDocs,
  ApiServiceAccessDocs,
  ApiVerifyAccountDocs,
} from './docs/banking.swagger.js';
import { AccountVerificationDto } from './dtos/account-verification.dto.js';
import { BankParamsDto } from './dtos/bank-params.dto.js';
import { AccountVerificationResult } from './bank.types.js';

@ApiBankingControllerDocs()
@ApiServiceAccessDocs()
@Controller('banks/:bank')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @UseGuards(ServiceAuthenticationGuard, ServiceAuthorizationGuard)
  @RequireServicePermission('VERIFY_ACCOUNT')
  @ApiVerifyAccountDocs()
  @Post('account-verifications')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  verifyAccount(
    @Param() params: BankParamsDto,
    @Body() body: AccountVerificationDto,
  ): Promise<AccountVerificationResult> {
    return this.bankingService.verifyAccount(params.bank, body);
  }
}
