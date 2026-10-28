import { HttpStatus, Injectable } from '@nestjs/common';

import { PublicHttpException } from '../common/public-http.exceptions.js';
import { BankConnectionManager } from '../database/bank-connection-manager.js';
import { BANK_CONFIG } from '../database/bank-code.js';
import type { BankCode } from '../database/bank-code.js';
import { databaseFailureCode } from '../database/database-error.js';

import { BankingRepository } from './banking.repository.js';
import type { AccountVerificationDto } from './dtos/account-verification.dto.js';
import type { AccountVerificationResult } from './bank.types.js';

@Injectable()
export class BankingService {
  constructor(
    private readonly banks: BankConnectionManager,
    private readonly repository: BankingRepository,
  ) {}

  async verifyAccount(
    bank: BankCode,
    input: AccountVerificationDto,
  ): Promise<AccountVerificationResult> {
    if (!input.ifsc.startsWith(BANK_CONFIG[bank].ifscPrefix)) {
      throw new PublicHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'IFSC prefix does not match the selected bank.',
      );
    }

    try {
      const manager = this.banks.managerFor(bank);

      const facts = await this.repository.findVerificationFacts(
        manager,
        input.accountNumber,
      );

      if (facts === null) {
        return {
          verified: false,
          reason: 'ACCOUNT_NOT_FOUND',
        };
      }

      if (facts.ifsc !== input.ifsc) {
        return {
          verified: false,
          reason: 'IFSC_MISMATCH',
        };
      }

      if (facts.ownerTaxIdRef !== input.expectedOwnerTaxIdRef) {
        return {
          verified: false,
          reason: 'OWNER_MISMATCH',
        };
      }

      if (facts.status !== 'ACTIVE') {
        return {
          verified: false,
          reason: facts.status,
        };
      }

      return {
        verified: true,
        accountHolderName: facts.accountHolderName,
        accountReference: facts.accountReference,
        bank,
        currency: facts.currency,
        status: facts.status,
      };
    } catch (error: unknown) {
      const code = databaseFailureCode(error);
      if (code != undefined) {
        throw new PublicHttpException(
          HttpStatus.SERVICE_UNAVAILABLE,
          code,
          'The selected bank is temporarily unavailable.',
        );
      }
      throw error;
    }
  }
}
