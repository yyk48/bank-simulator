import type { Bank, BankCode } from '../bank-code.js';

import type {
  AccountStatus,
  AccountType,
  AccountPurpose,
  HolderType,
} from '../../banking/bank.types.js';

export interface BranchSeed {
  id: string;
  bankCode: BankCode;
  branchName: string;
  ifscCode: string;
}

export interface HolderSeed {
  id: string;
  holderName: string;
  ownerTaxIdRef: string;
  holderType: HolderType;
  mobileNumber: string;
  email: string;
}

export interface AccountSeed {
  id: string;
  accountNumber: string;
  accountHolderId: string;
  branchId: string;
  accountType: AccountType;
  accountPurpose: AccountPurpose;
  currency: 'INR';
  status: AccountStatus;
  balancePaise: string;
}

export interface BankSeedData {
  bank: Bank;
  branches: BranchSeed[];
  accountHolders: HolderSeed[];
  bankAccounts: AccountSeed[];
}

export interface SeedCounts {
  branches: number;
  accountHolders: number;
  bankAccounts: number;
}

export class SeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedError';
  }
}
