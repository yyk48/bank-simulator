import type {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

/**
 * Schema migration:
 * Applies the same core banking structure to each bank database.
 * Changes run explicitly through TypeORM using the migrator role.
 */
export class CreateCoreBankTables1791455400000
  implements MigrationInterface
{
  name = 'CreateCoreBankTables1791455400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Keep historical migration mappings local to this migration.
    const bankCodes = new Map<string, string>([
      ['icici_bank', 'ICICI'],
      ['hdfc_bank', 'HDFC'],
      ['sbi_bank', 'SBI'],
    ]);

    const database = queryRunner.connection.options.database;

    const bankCode =
      typeof database === 'string'
        ? bankCodes.get(database)
        : undefined;

    if (bankCode === undefined) {
      throw new Error(
        'This migration requires a configured bank database.',
      );
    }

    // Derived exclusively from the fixed mapping above.
    const appRole = `${bankCode.toLowerCase()}_app`;

    await queryRunner.query(`
      CREATE TABLE public.branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        bank_code VARCHAR(5) NOT NULL
          DEFAULT '${bankCode}',

        branch_name VARCHAR(120) NOT NULL,
        ifsc VARCHAR(11) NOT NULL UNIQUE,

        created_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT branches_bank_code_check
          CHECK (bank_code = '${bankCode}'),

        CONSTRAINT branches_name_check
          CHECK (length(btrim(branch_name)) > 0),

        CONSTRAINT branches_ifsc_check
          CHECK (ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE public.account_holders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        holder_name VARCHAR(120) NOT NULL,

        "owner_taxID_ref" VARCHAR(10) NOT NULL UNIQUE,

        created_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT account_holders_name_check
          CHECK (length(btrim(holder_name)) > 0),

        CONSTRAINT account_holders_pan_check
          CHECK (
            "owner_taxID_ref" ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
          )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE public.bank_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        account_number VARCHAR(34) NOT NULL UNIQUE,

        account_holder_id UUID NOT NULL
          REFERENCES public.account_holders(id)
          ON DELETE RESTRICT,

        branch_id UUID NOT NULL
          REFERENCES public.branches(id)
          ON DELETE RESTRICT,

        account_type VARCHAR(20) NOT NULL,
        account_purpose VARCHAR(30) NOT NULL,

        currency VARCHAR(3) NOT NULL DEFAULT 'INR',

        status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',

        balance_paise BIGINT NOT NULL DEFAULT 0,

        created_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT bank_accounts_number_check
          CHECK (account_number ~ '^[0-9]+$'),

        CONSTRAINT bank_accounts_type_check
          CHECK (account_type IN ('SAVINGS', 'CURRENT')),

        CONSTRAINT bank_accounts_purpose_check
          CHECK (
            account_purpose IN (
              'CUSTOMER',
              'PLATFORM_SETTLEMENT'
            )
          ),

        CONSTRAINT bank_accounts_currency_check
          CHECK (currency = 'INR'),

        CONSTRAINT bank_accounts_status_check
          CHECK (
            status IN ('ACTIVE', 'INACTIVE', 'FROZEN')
          ),

        CONSTRAINT bank_accounts_balance_check
          CHECK (balance_paise >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX bank_accounts_holder_idx
      ON public.bank_accounts (account_holder_id)
    `);

    await queryRunner.query(`
      CREATE INDEX bank_accounts_branch_idx
      ON public.bank_accounts (branch_id)
    `);

    // At most one settlement account in this bank database.
    // The seed step will ensure that one actually exists.
    await queryRunner.query(`
      CREATE UNIQUE INDEX bank_accounts_one_settlement_idx
      ON public.bank_accounts (account_purpose)
      WHERE account_purpose = 'PLATFORM_SETTLEMENT'
    `);

    // Keep timestamps correct for updates through either SQL or TypeORM.
    await queryRunner.query(`
      CREATE FUNCTION public.set_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$
    `);

    const tables = [
      'branches',
      'account_holders',
      'bank_accounts',
    ] as const;

    for (const table of tables) {
      await queryRunner.query(`
        CREATE TRIGGER ${table}_set_updated_at
        BEFORE UPDATE ON public.${table}
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at()
      `);
    }

    // Table ownership stays with the migrator.
    // The application receives only the required data privileges.
    await queryRunner.query(`
      GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE
        public.branches,
        public.account_holders,
        public.bank_accounts
      TO ${appRole}
    `);

    // Earlier default privileges may grant access to all new tables.
    // Migration history must remain outside application permissions.
    await queryRunner.query(`
      REVOKE ALL PRIVILEGES
      ON TABLE public.typeorm_migrations
      FROM ${appRole}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE public.bank_accounts
    `);

    await queryRunner.query(`
      DROP TABLE public.account_holders
    `);

    await queryRunner.query(`
      DROP TABLE public.branches
    `);

    await queryRunner.query(`
      DROP FUNCTION public.set_updated_at()
    `);
  }
}