import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity.js';
import type { AccountVerificationFacts } from './bank.types.js';

function parseFacts(value: unknown): AccountVerificationFacts | null {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('accountHolderName' in value) ||
    typeof value.accountHolderName !== 'string' ||
    !('accountReference' in value) ||
    typeof value.accountReference !== 'string' ||
    !('ifsc' in value) ||
    typeof value.ifsc !== 'string' ||
    !('ownerTaxIdRef' in value) ||
    typeof value.ownerTaxIdRef !== 'string' ||
    !('currency' in value) ||
    typeof value.currency !== 'string' ||
    !('status' in value) ||
    (value.status !== 'ACTIVE' &&
      value.status !== 'INACTIVE' &&
      value.status !== 'FROZEN')
  ) {
    throw new Error('Invalid account verification projection.');
  }
  return {
    accountHolderName: value.accountHolderName,
    accountReference: value.accountReference,
    ifsc: value.ifsc,
    ownerTaxIdRef: value.ownerTaxIdRef,
    currency: value.currency,
    status: value.status,
  };
}

/**
 * Repository pattern: owns database queries, with no business decisions. the application service makes eligibility decisions..
 * The caller supplies the selected bank's manager on every operation.
 * During a transfer, the caller must supply the transaction's manager.
 */
@Injectable()
export class BankingRepository {
  async findVerificationFacts(
    manager: EntityManager,
    accountNumber: string,
  ): Promise<AccountVerificationFacts | null> {
    const raw: unknown = await manager
      .createQueryBuilder(BankAccount, 'account')
      .innerJoin('account.branch', 'branch')
      .innerJoin('account.accountHolder', 'holder')
      .select('account.id', 'accountReference')
      .addSelect('holder.holderName', 'accountHolderName')
      .addSelect('branch.ifscCode', 'ifsc')
      .addSelect('holder.ownerTaxIdRef', 'ownerTaxIdRef')
      .addSelect('account.currency', 'currency')
      .addSelect('account.status', 'status')
      .where('account.accountNumber = :accountNumber', { accountNumber })
      .getRawOne<unknown>();

    return parseFacts(raw);
  }
}
