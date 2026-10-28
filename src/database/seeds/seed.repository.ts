import type { EntityManager } from 'typeorm';
import type { BankSeedData, SeedCounts } from './seed.types.js';
import { SeedError } from './seed.types.js';

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new SeedError('Unexpected database result.');
  }

  return value.map((row: unknown) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new SeedError('Unexpected database row.');
    }
    return Object.fromEntries(Object.entries(row));
  });
}

/**
 * Insert-only seeds: verify existing fixture identity without updating rows.
 * Every query uses the transaction manager supplied by the seed runner.
 */
export class SeedRepository {
  constructor(private readonly manager: Pick<EntityManager, 'query'>) {}

  private async insert(sql: string, parameters: unknown[]): Promise<number> {
    const result: unknown = await this.manager.query(sql, parameters);
    return records(result).length;
  }

  private async verify(
    sql: string,
    id: string,
    expected: Record<string, string>,
    label: string,
  ): Promise<void> {
    const result: unknown = await this.manager.query(sql, [id]);
    const row = records(result)[0];

    if (
      row === undefined ||
      Object.entries(expected).some(([key, value]) => row[key] !== value)
    ) {
      throw new SeedError(
        `Existing ${label} conflicts with the seed identity; no rows were committed.`,
      );
    }
  }

  async insertMissing(data: BankSeedData): Promise<SeedCounts> {
    const inserted: SeedCounts = {
      branches: 0,
      accountHolders: 0,
      bankAccounts: 0,
    };

    await this.manager.query(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [1791455400, 1],
    );

    // Reject old settlement fixtures that this dataset no longer includes.
    const result: unknown = await this.manager.query(`
      SELECT id
      FROM public.bank_accounts
      WHERE account_purpose = 'PLATFORM_SETTLEMENT'
    `);

    const expectedSettlementIds = new Set(
      data.bankAccounts
        .filter((row) => row.accountPurpose === 'PLATFORM_SETTLEMENT')
        .map((row) => row.id),
    );

    if (
      records(result).some(
        (row) =>
          typeof row.id !== 'string' || !expectedSettlementIds.has(row.id),
      )
    ) {
      throw new SeedError(
        'An existing settlement account conflicts with the ICICI-only setup. Seeds do not delete existing accounts.',
      );
    }

    for (const row of data.branches) {
      inserted.branches += await this.insert(
        `
        INSERT INTO public.branches
          (id, bank_code, branch_name, ifsc_code)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
        RETURNING id
        `,
        [row.id, row.bankCode, row.branchName, row.ifscCode],
      );

      await this.verify(
        `
        SELECT bank_code, branch_name, ifsc_code
        FROM public.branches
        WHERE id = $1
        `,
        row.id,
        {
          bank_code: row.bankCode,
          branch_name: row.branchName,
          ifsc_code: row.ifscCode,
        },
        'branch',
      );
    }

    for (const row of data.accountHolders) {
      inserted.accountHolders += await this.insert(
        `
        INSERT INTO public.account_holders
          (id, holder_name, "owner_taxID_ref",
           holder_type, mobile_number, email)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
        RETURNING id
        `,
        [
          row.id,
          row.holderName,
          row.ownerTaxIdRef,
          row.holderType,
          row.mobileNumber,
          row.email,
        ],
      );

      await this.verify(
        `
        SELECT holder_name, "owner_taxID_ref",
               holder_type, mobile_number, email
        FROM public.account_holders
        WHERE id = $1
        `,
        row.id,
        {
          holder_name: row.holderName,
          owner_taxID_ref: row.ownerTaxIdRef,
          holder_type: row.holderType,
          mobile_number: row.mobileNumber,
          email: row.email,
        },
        'holder',
      );
    }

    for (const row of data.bankAccounts) {
      inserted.bankAccounts += await this.insert(
        `
        INSERT INTO public.bank_accounts
          (id, account_number, account_holder_id, branch_id,
           account_type, account_purpose, currency, status, balance_paise)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::bigint)
        ON CONFLICT (id) DO NOTHING
        RETURNING id
        `,
        [
          row.id,
          row.accountNumber,
          row.accountHolderId,
          row.branchId,
          row.accountType,
          row.accountPurpose,
          row.currency,
          row.status,
          row.balancePaise,
        ],
      );

      // Preserve balances, statuses and timestamps on reruns.
      await this.verify(
        `
        SELECT account_number, account_holder_id, branch_id,
               account_type, account_purpose, currency
        FROM public.bank_accounts
        WHERE id = $1
        `,
        row.id,
        {
          account_number: row.accountNumber,
          account_holder_id: row.accountHolderId,
          branch_id: row.branchId,
          account_type: row.accountType,
          account_purpose: row.accountPurpose,
          currency: row.currency,
        },
        'account',
      );
    }

    return inserted;
  }
}
