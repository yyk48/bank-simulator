import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import type { BankCode } from './bank-code.js';
import { PublicHttpException } from '../common/public-http.exceptions.js';
import { BANK_CONFIG } from './bank-code.js';

import { Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';

import { assertBankSchemaCompatible } from './bank-schema.js';

/**
 * Registry pattern: resolves an explicit bank to its named DataSource.
 * Request text never becomes a database name, credential or connection string.
 * Existing TypeOrmModule registration owns connection startup in this increment.
 */
@Injectable()
export class BankConnectionManager implements OnModuleInit {
  private readonly sources: Readonly<Record<BankCode, DataSource>>;

  constructor(
    @InjectDataSource(BANK_CONFIG.ICICI.connectionName) icici: DataSource,
    @InjectDataSource(BANK_CONFIG.HDFC.connectionName) hdfc: DataSource,
    @InjectDataSource(BANK_CONFIG.SBI.connectionName) sbi: DataSource,
  ) {
    this.sources = Object.freeze({ ICICI: icici, HDFC: hdfc, SBI: sbi });
  }

  private readonly logger = new Logger(BankConnectionManager.name);

  private readonly compatibleBanks = new Set<BankCode>();

  async onModuleInit(): Promise<void> {
    const banks = Object.keys(this.sources) as BankCode[];

    await Promise.all(banks.map((bank) => this.checkSchemaFor(bank)));
  }

  async checkSchemaFor(bank: BankCode): Promise<boolean> {
    this.compatibleBanks.delete(bank);

    try {
      await assertBankSchemaCompatible(this.sources[bank]);

      this.compatibleBanks.add(bank);
      return true;
    } catch {
      this.logger.error(
        `${bank}: schema check failed; bank remains unavailable. ` +
          'Check migrations and schema-history refresh.',
      );

      return false;
    }
  }

  managerFor(bank: BankCode): EntityManager {
    const source = this.sources[bank];
    if (!source.isInitialized || !this.compatibleBanks.has(bank)) {
      throw new PublicHttpException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'BANK_UNAVAILABLE',
        'The selected bank is temporarily unavailable.',
      );
    }
    return source.manager;
  }
}
