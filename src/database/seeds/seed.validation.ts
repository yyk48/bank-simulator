import Joi from 'joi';
import { BANKS, BANK_CODES, BANK_CONFIG } from '../bank-code.js';
import type { Bank } from '../bank-code.js';
import type { BankSeedData } from './seed.types.js';
import { SeedError } from './seed.types.js';

const uuid = Joi.string()
  .guid({ version: ['uuidv4'] })
  .pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
  .required();

const nonBlankName = Joi.string().trim().min(1).required();

const schema: Joi.ObjectSchema<BankSeedData> = Joi.object({
  bank: Joi.string()
    .valid(...BANKS)
    .required(),

  branches: Joi.array()
    .min(1)
    .items(
      Joi.object({
        id: uuid,
        bankCode: Joi.string()
          .valid(...BANK_CODES)
          .required(),
        branchName: nonBlankName,
        ifscCode: Joi.string()
          .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
          .required(),
      }),
    )
    .required(),

  accountHolders: Joi.array()
    .min(1)
    .items(
      Joi.object({
        id: uuid,
        holderName: nonBlankName,
        ownerTaxIdRef: Joi.string()
          .max(100)
          .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
          .required(),
        holderType: Joi.string().valid('PERSON', 'ORGANIZATION').required(),
        mobileNumber: Joi.string()
          .pattern(/^[6-9][0-9]{9}$/)
          .required(),
        email: Joi.string()
          .max(254)
          .email({ tlds: { allow: false } })
          .required(),
      }),
    )
    .required(),

  bankAccounts: Joi.array()
    .min(1)
    .items(
      Joi.object({
        id: uuid,
        accountNumber: Joi.string()
          .pattern(/^[0-9]{1,32}$/)
          .required(),
        accountHolderId: uuid,
        branchId: uuid,
        accountType: Joi.string().valid('SAVINGS', 'CURRENT').required(),
        accountPurpose: Joi.string()
          .valid('CUSTOMER', 'PLATFORM_SETTLEMENT', 'SELLER')
          .required(),
        currency: Joi.string().valid('INR').required(),
        status: Joi.string().valid('ACTIVE', 'INACTIVE', 'FROZEN').required(),
        balancePaise: Joi.string()
          .pattern(/^(0|[1-9][0-9]{0,18})$/)
          .required(),
      }),
    )
    .required(),
});

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new SeedError(`Duplicate ${label} in seed data.`);
  }
}

/** External JSON remains unknown until runtime validation succeeds. */
export async function validateSeedData(
  input: unknown,
  bank: Bank,
): Promise<BankSeedData> {
  let data: BankSeedData;

  try {
    data = await schema.validateAsync(input, {
      convert: false,
      abortEarly: false,
      allowUnknown: false,
    });
  } catch (error: unknown) {
    if (Joi.isError(error)) {
      const fields = error.details
        .map((detail) => detail.path.join('.'))
        .join(', ');

      throw new SeedError(`Invalid seed fields: ${fields}.`);
    }
    throw error;
  }

  const bankCode = BANK_CODES.find(
    (code) => BANK_CONFIG[code].connectionName === bank,
  );

  if (
    bankCode === undefined ||
    data.bank !== bank ||
    data.branches.some((branch) => branch.bankCode !== bankCode)
  ) {
    throw new SeedError('Seed bank does not match the selected bank.');
  }

  const prefix = BANK_CONFIG[bankCode].ifscPrefix;

  if (data.branches.some((branch) => !branch.ifscCode.startsWith(prefix))) {
    throw new SeedError('A branch IFSC does not match the selected bank.');
  }

  unique(
    data.branches.map((row) => row.id),
    'branch IDs',
  );
  unique(
    data.branches.map((row) => row.ifscCode),
    'IFSCs',
  );
  unique(
    data.accountHolders.map((row) => row.id),
    'holder IDs',
  );
  unique(
    data.accountHolders.map((row) => row.ownerTaxIdRef),
    'owner references',
  );
  unique(
    data.bankAccounts.map((row) => row.id),
    'account IDs',
  );
  unique(
    data.bankAccounts.map((row) => row.accountNumber),
    'account numbers',
  );

  const branchIds = new Set(data.branches.map((row) => row.id));
  const holderIds = new Set(data.accountHolders.map((row) => row.id));
  const maxBalance = 9_223_372_036_854_775_807n;
  let total = 0n;

  for (const account of data.bankAccounts) {
    if (
      !branchIds.has(account.branchId) ||
      !holderIds.has(account.accountHolderId)
    ) {
      throw new SeedError(
        'An account references a missing branch or holder in this dataset.',
      );
    }

    const amount = BigInt(account.balancePaise);
    if (amount > maxBalance) {
      throw new SeedError('A balance exceeds PostgreSQL BIGINT.');
    }
    total += amount;
  }

  if (total > maxBalance) {
    throw new SeedError('The initial dataset total exceeds PostgreSQL BIGINT.');
  }

  // Fixture policy: the platform settlement account exists only in ICICI.
  const settlements = data.bankAccounts.filter(
    (row) => row.accountPurpose === 'PLATFORM_SETTLEMENT',
  );

  if (bank === 'icici') {
    if (settlements.length !== 1 || settlements[0]?.status !== 'ACTIVE') {
      throw new SeedError(
        'Provide exactly one initially active settlement account in ICICI.',
      );
    }
  } else if (settlements.length !== 0) {
    throw new SeedError(
      'HDFC and SBI seed data must not contain platform settlement accounts.',
    );
  }

  return data;
}
