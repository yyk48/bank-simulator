import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceHolderPermissions1793287887947 implements MigrationInterface {
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
    CREATE TABLE public.service_holder_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      client_code TEXT NOT NULL,

      account_holder_id UUID NOT NULL
        REFERENCES public.account_holders(id)
        ON DELETE RESTRICT,

      enabled BOOLEAN NOT NULL DEFAULT FALSE,

      CONSTRAINT service_holder_permissions_client_code_check
        CHECK (client_code ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),

      CONSTRAINT service_holder_permissions_client_holder_unique
        UNIQUE (client_code, account_holder_id)
    );

    CREATE INDEX service_holder_permissions_holder_idx
      ON public.service_holder_permissions (account_holder_id);
  `);

    await queryRunner.query(`
    REVOKE ALL ON TABLE public.service_holder_permissions
      FROM PUBLIC, "${appRole}";

    GRANT SELECT ON TABLE public.service_holder_permissions
      TO "${appRole}";
  `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    LOCK TABLE public.service_holder_permissions
      IN ACCESS EXCLUSIVE MODE;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM public.service_holder_permissions
      ) THEN
        RAISE EXCEPTION
          'Cannot revert: service_holder_permissions contains grants';
      END IF;
    END;
    $$;

    DROP TABLE public.service_holder_permissions;
  `);
  }
}
