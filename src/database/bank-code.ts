export const BANK_CONFIG = {
  ICICI: {
    connectionName: 'icici',
    ifscPrefix: 'ICIC',
  },
  HDFC: {
    connectionName: 'hdfc',
    ifscPrefix: 'HDFC',
  },
  SBI: {
    connectionName: 'sbi',
    ifscPrefix: 'SBIN',
  },
} as const;

export type BankCode = keyof typeof BANK_CONFIG;

export type Bank = (typeof BANK_CONFIG)[BankCode]['connectionName'];

export const BANK_CODES = Object.keys(BANK_CONFIG) as BankCode[];

export const BANKS: Bank[] = Object.values(BANK_CONFIG).map(
  (bank) => bank.connectionName,
);
