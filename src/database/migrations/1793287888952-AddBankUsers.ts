import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankUsers1793287888952 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const roles = new Map<string, string>([
      ['icici_bank', 'icici_app'],
      ['hdfc_bank', 'hdfc_app'],
      ['sbi_bank', 'sbi_app'],
    ]);

    const database = queryRunner.connection.options.database;
    const appRole =
      typeof database === 'string' ? roles.get(database) : undefined;

    if (!appRole) {
      throw new Error('This migration requires a configured bank database.');
    }

    await queryRunner.query(`
    CREATE TABLE public.bank_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      account_holder_id UUID NOT NULL,

      username VARCHAR(100) NOT NULL,

      password_hash TEXT NOT NULL,

      status TEXT NOT NULL DEFAULT 'ACTIVE',

      CONSTRAINT bank_users_holder_fk
        FOREIGN KEY (account_holder_id)
        REFERENCES public.account_holders(id)
        ON DELETE RESTRICT,

      CONSTRAINT bank_users_username_unique
        UNIQUE (username),

      CONSTRAINT bank_users_username_check
        CHECK (
          username <> ''
          AND username = lower(btrim(username))
          AND username !~ '[[:space:]]'
        ),

      CONSTRAINT bank_users_password_hash_check
        CHECK (length(btrim(password_hash)) > 0),

      CONSTRAINT bank_users_status_check
        CHECK (status IN ('ACTIVE', 'DISABLED'))
    );

    CREATE INDEX bank_users_holder_idx
      ON public.bank_users (account_holder_id);
  `);

    await queryRunner.query(`
    REVOKE ALL ON TABLE public.bank_users
      FROM PUBLIC, "${appRole}";

    GRANT SELECT ON TABLE public.bank_users
      TO "${appRole}";
  `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    LOCK TABLE public.bank_users IN ACCESS EXCLUSIVE MODE;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM public.bank_users
      ) THEN
        RAISE EXCEPTION
          'Cannot revert: bank_users contains login records';
      END IF;
    END;
    $$;

    DROP TABLE public.bank_users;
  `);
  }
}
