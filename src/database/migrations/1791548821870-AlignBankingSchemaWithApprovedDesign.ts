import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignBankingSchemaWithApprovedDesign1791548821870 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Schema migration: align existing tables with the approved design.
    // Existing holders require an explicit contact/type backfill.
    await queryRunner.query(`
        LOCK TABLE
        public.branches,
        public.account_holders,
        public.bank_accounts
        IN ACCESS EXCLUSIVE MODE;

        DO $$
        BEGIN
        IF EXISTS (SELECT 1 FROM public.account_holders) THEN
            RAISE EXCEPTION
            'Account holders already exist. Supply an explicit holder type and contact DBA before applying this migration.';
        END IF;
        END;
        $$;
    `);

    await queryRunner.query(`
        ALTER TABLE public.branches
        RENAME COLUMN ifsc TO ifsc_code;

        ALTER TABLE public.branches
        ALTER COLUMN bank_code TYPE TEXT,
        ALTER COLUMN branch_name TYPE TEXT,
        ALTER COLUMN id DROP DEFAULT;
    `);

    await queryRunner.query(`
        ALTER TABLE public.account_holders
        ALTER COLUMN "owner_taxID_ref" TYPE VARCHAR(100),
        ALTER COLUMN holder_name TYPE TEXT,
        ALTER COLUMN id DROP DEFAULT,

        ADD COLUMN holder_type TEXT NOT NULL,
        ADD COLUMN mobile_number VARCHAR(32) NOT NULL,
        ADD COLUMN email VARCHAR(254) NOT NULL,

        ADD CONSTRAINT account_holders_type_check
            CHECK (holder_type IN ('PERSON', 'ORGANIZATION')),

        ADD CONSTRAINT account_holders_mobile_check
            CHECK (mobile_number ~ '^[6-9][0-9]{9}$');
    `);

    await queryRunner.query(`
        ALTER TABLE public.bank_accounts
        DROP CONSTRAINT bank_accounts_purpose_check;

        ALTER TABLE public.bank_accounts
        ALTER COLUMN account_number TYPE VARCHAR(32),
        ALTER COLUMN account_type TYPE TEXT,
        ALTER COLUMN account_purpose TYPE TEXT,
        ALTER COLUMN currency TYPE CHAR(3),
        ALTER COLUMN status TYPE TEXT,
        ALTER COLUMN id DROP DEFAULT;

        ALTER TABLE public.bank_accounts
        ADD CONSTRAINT bank_accounts_purpose_check
            CHECK (
            account_purpose IN (
                'CUSTOMER',
                'PLATFORM_SETTLEMENT',
                'SELLER'
            )
            );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Guard rollback: dropping contact columns must not discard holder data.
    await queryRunner.query(`
        LOCK TABLE
        public.branches,
        public.account_holders,
        public.bank_accounts
        IN ACCESS EXCLUSIVE MODE;

        DO $$
        BEGIN
        IF EXISTS (SELECT 1 FROM public.account_holders) THEN
            RAISE EXCEPTION
            'Rollback would discard holder type and contact data. A reviewed data-preserving rollback is required.';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.branches
            WHERE length(branch_name) > 120
        ) THEN
            RAISE EXCEPTION
            'Rollback cannot fit an existing branch name into VARCHAR(120).';
        END IF;
        END;
        $$;
    `);

    await queryRunner.query(`
        ALTER TABLE public.bank_accounts
        DROP CONSTRAINT bank_accounts_purpose_check;

        ALTER TABLE public.bank_accounts
        ALTER COLUMN account_number TYPE VARCHAR(34),
        ALTER COLUMN account_type TYPE VARCHAR(20),
        ALTER COLUMN account_purpose TYPE VARCHAR(30),
        ALTER COLUMN currency TYPE VARCHAR(3),
        ALTER COLUMN status TYPE VARCHAR(10),
        ALTER COLUMN id SET DEFAULT gen_random_uuid();

        ALTER TABLE public.bank_accounts
        ADD CONSTRAINT bank_accounts_purpose_check
            CHECK (
            account_purpose IN (
                'CUSTOMER',
                'PLATFORM_SETTLEMENT'
            )
            );
    `);

    await queryRunner.query(`
        ALTER TABLE public.account_holders
        DROP CONSTRAINT account_holders_type_check,
        DROP CONSTRAINT account_holders_mobile_check,
        DROP COLUMN holder_type,
        DROP COLUMN mobile_number,
        DROP COLUMN email,
        ALTER COLUMN "owner_taxID_ref" TYPE VARCHAR(10),
        ALTER COLUMN holder_name TYPE VARCHAR(120),
        ALTER COLUMN id SET DEFAULT gen_random_uuid();
    `);

    await queryRunner.query(`
        ALTER TABLE public.branches
        ALTER COLUMN bank_code TYPE VARCHAR(5),
        ALTER COLUMN branch_name TYPE VARCHAR(120),
        ALTER COLUMN id SET DEFAULT gen_random_uuid();

        ALTER TABLE public.branches
        RENAME COLUMN ifsc_code TO ifsc;
    `);
  }
}
