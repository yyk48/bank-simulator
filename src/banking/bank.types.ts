import type { BankCode } from '../database/bank-code.js';

export type AccountType = 'SAVINGS' | 'CURRENT';

export type AccountPurpose = 'CUSTOMER' | 'PLATFORM_SETTLEMENT' | 'SELLER';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'FROZEN';

export type HolderType = 'PERSON' | 'ORGANIZATION';

export interface AccountVerificationFacts {
  readonly accountHolderName: string;
  readonly accountReference: string;
  readonly ifsc: string;
  readonly ownerTaxIdRef: string;
  readonly currency: string;
  readonly status: AccountStatus;
}

export type VerificationFailure =
  | 'ACCOUNT_NOT_FOUND'
  | 'IFSC_MISMATCH'
  | 'OWNER_MISMATCH'
  | 'INACTIVE'
  | 'FROZEN';

export type VerificationSuccess = Pick<
  AccountVerificationFacts,
  'accountHolderName' | 'accountReference' | 'currency' | 'status'
> & {
  readonly verified: true;
  readonly bank: BankCode;
};

export type AccountVerificationResult =
  | {
      readonly verified: false;
      readonly reason: VerificationFailure;
    }
  | VerificationSuccess;

export type TransferRecordSide = 'LOCAL' | 'OUTGOING' | 'INCOMING';

export type TransferPurpose = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';

export type TransferStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export type TransferStage =
  | 'AWAITING_APPROVAL'
  | 'AWAITING_EXECUTION'
  | 'SOURCE_DEBITED'
  | 'REFUND_PENDING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'CREDITED';

export type ApprovalStatus =
  'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'EXPIRED' | 'LOCKED';

export type SimulationScenario =
  | 'NORMAL'
  | 'BUSINESS_REJECT'
  | 'INSUFFICIENT_FUNDS'
  | 'DELAY_BEFORE_EXECUTION'
  | 'TIMEOUT_BEFORE_ACCEPTANCE'
  | 'TIMEOUT_AFTER_COMMIT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PAUSE_AFTER_SOURCE_DEBIT'
  | 'LOSE_DESTINATION_REPLY'
  | 'DUPLICATE_CALLBACK'
  | 'FAIL_CALLBACK_ONCE'
  | 'DELAY_CALLBACK';

export type CallbackDeliveryStatus = 'PENDING' | 'DELIVERED' | 'EXHAUSTED';

export type CallbackAttemptTrigger = 'AUTOMATIC' | 'ADMIN_REPLAY';

export type CallbackAttemptStatus =
  'STARTED' | 'DELIVERED' | 'HTTP_ERROR' | 'TIMEOUT' | 'UNKNOWN';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | JsonObject;

export type JsonObject = {
  [key: string]: JsonValue;
};
