import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransferWorkflow1792323135690 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const rows: unknown = await queryRunner.query(`
    SELECT
      current_database() AS database,
      current_user AS username
  `);

    if (!Array.isArray(rows)) {
      throw new Error('Cannot identify migration connection.');
    }

    const row = rows[0] as
      { database?: unknown; username?: unknown } | undefined;

    // Historical migration mappings stay inside the migration.
    const banks = new Map([
      ['icici_bank', ['ICICI', 'icici_app', 'icici_migrator']],
      ['hdfc_bank', ['HDFC', 'hdfc_app', 'hdfc_migrator']],
      ['sbi_bank', ['SBI', 'sbi_app', 'sbi_migrator']],
    ]);

    const target =
      typeof row?.database === 'string' ? banks.get(row.database) : undefined;

    if (!target || row?.username !== target[2]) {
      throw new Error('Use the selected bank migrator account.');
    }

    const [bankCode, appRole] = target;

    // Interpolated identifiers/values come only from the fixed mapping.
    await queryRunner.query(`
    CREATE TABLE public.transfers (
      id UUID PRIMARY KEY,
      network_transfer_id UUID NOT NULL,
      local_bank TEXT NOT NULL,
      record_side TEXT NOT NULL,

      client_id VARCHAR(100) NOT NULL,
      client_request_id VARCHAR(128) NOT NULL,
      request_fingerprint CHAR(64) NOT NULL,
      purpose TEXT NOT NULL,

      source_bank TEXT NOT NULL,
      destination_bank TEXT NOT NULL,
      source_account_id UUID,
      destination_account_id UUID,

      source_account_number VARCHAR(32) NOT NULL,
      destination_account_number VARCHAR(32) NOT NULL,
      source_ifsc VARCHAR(11) NOT NULL,
      destination_ifsc VARCHAR(11) NOT NULL,

      "expected_source_owner_taxID_ref" VARCHAR(100) NOT NULL,
      "expected_destination_owner_taxID_ref" VARCHAR(100) NOT NULL,

      approval_status TEXT NOT NULL,
      approval_requested_at TIMESTAMPTZ,
      request_expires_at TIMESTAMPTZ,

      otp_digest CHAR(64),
      otp_nonce UUID,
      otp_key_id VARCHAR(100),
      otp_expires_at TIMESTAMPTZ,
      otp_failed_attempts INTEGER NOT NULL DEFAULT 0,
      otp_generation INTEGER NOT NULL DEFAULT 0,

      approved_at TIMESTAMPTZ,
      approved_by_holder_id UUID,

      amount_paise BIGINT NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'INR',

      status TEXT NOT NULL,
      stage TEXT NOT NULL,
      failure_code VARCHAR(64),
      last_error_code VARCHAR(64),

      simulation_scenario TEXT NOT NULL DEFAULT 'NORMAL',
      callback_destination_key VARCHAR(100),

      debit_applied_at TIMESTAMPTZ,
      credit_applied_at TIMESTAMPTZ,
      refunded_at TIMESTAMPTZ,

      recovery_attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ,
      lease_token UUID,
      lease_expires_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMPTZ,

      CONSTRAINT fk_transfers_source_account_id
        FOREIGN KEY (source_account_id)
        REFERENCES public.bank_accounts(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,

      CONSTRAINT fk_transfers_destination_account_id
        FOREIGN KEY (destination_account_id)
        REFERENCES public.bank_accounts(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,

      CONSTRAINT fk_transfers_approved_by_holder_id
        FOREIGN KEY (approved_by_holder_id)
        REFERENCES public.account_holders(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,

      CONSTRAINT ck_transfers_local_bank
        CHECK (local_bank = '${bankCode}'),

      CONSTRAINT ck_transfers_banks CHECK (
        source_bank IN ('ICICI', 'HDFC', 'SBI')
        AND destination_bank IN ('ICICI', 'HDFC', 'SBI')
      ),

      CONSTRAINT ck_transfers_routing CHECK (
        (
          record_side = 'LOCAL'
          AND source_bank = local_bank
          AND destination_bank = local_bank
        )
        OR (
          record_side = 'OUTGOING'
          AND source_bank = local_bank
          AND destination_bank <> local_bank
          AND destination_account_id IS NULL
        )
        OR (
          record_side = 'INCOMING'
          AND destination_bank = local_bank
          AND source_bank <> local_bank
          AND source_account_id IS NULL
          AND approved_by_holder_id IS NULL
        )
      ),

      CONSTRAINT ck_transfers_client CHECK (
        length(btrim(client_id)) > 0
        AND client_request_id ~ '^[A-Za-z0-9._~-]{1,128}$'
      ),

      CONSTRAINT ck_transfers_fingerprint
        CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),

      CONSTRAINT ck_transfers_purpose
        CHECK (purpose IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),

      CONSTRAINT ck_transfers_snapshots CHECK (
        source_account_number ~ '^[0-9]{1,32}$'
        AND destination_account_number ~ '^[0-9]{1,32}$'
        AND source_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'
        AND destination_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'
        AND "expected_source_owner_taxID_ref"
          ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
        AND "expected_destination_owner_taxID_ref"
          ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
      ),

      CONSTRAINT ck_transfers_money
        CHECK (amount_paise > 0 AND currency = 'INR'),

      CONSTRAINT ck_transfers_scenario CHECK (
        simulation_scenario IN (
          'NORMAL',
          'BUSINESS_REJECT',
          'INSUFFICIENT_FUNDS',
          'DELAY_BEFORE_EXECUTION',
          'TIMEOUT_BEFORE_ACCEPTANCE',
          'TIMEOUT_AFTER_COMMIT',
          'PROVIDER_UNAVAILABLE',
          'PAUSE_AFTER_SOURCE_DEBIT',
          'LOSE_DESTINATION_REPLY',
          'DUPLICATE_CALLBACK',
          'FAIL_CALLBACK_ONCE',
          'DELAY_CALLBACK'
        )
      ),

      CONSTRAINT ck_transfers_callback CHECK (
        (
          record_side IN ('LOCAL', 'OUTGOING')
          AND callback_destination_key IS NOT NULL
          AND callback_destination_key ~ '^[A-Za-z0-9._~-]{1,100}$'
        )
        OR (
          record_side = 'INCOMING'
          AND callback_destination_key IS NULL
        )
      ),

      CONSTRAINT ck_transfers_state CHECK (
        (
          record_side IN ('LOCAL', 'OUTGOING')
          AND status = 'PENDING'
          AND stage IN ('AWAITING_APPROVAL', 'AWAITING_EXECUTION')
        )
        OR (
          record_side = 'OUTGOING'
          AND status = 'PENDING'
          AND stage IN ('SOURCE_DEBITED', 'REFUND_PENDING')
        )
        OR (
          record_side IN ('LOCAL', 'OUTGOING')
          AND status = 'SUCCEEDED'
          AND stage = 'COMPLETED'
        )
        OR (
          status = 'FAILED'
          AND stage = 'REJECTED'
        )
        OR (
          record_side = 'OUTGOING'
          AND status = 'FAILED'
          AND stage = 'REFUNDED'
        )
        OR (
          record_side = 'INCOMING'
          AND status = 'SUCCEEDED'
          AND stage = 'CREDITED'
        )
      ),

      CONSTRAINT ck_transfers_completion CHECK (
        (status = 'PENDING' AND completed_at IS NULL)
        OR (
          status IN ('SUCCEEDED', 'FAILED')
          AND completed_at IS NOT NULL
        )
      ),

      CONSTRAINT ck_transfers_failure CHECK (
        (
          (status = 'FAILED' OR stage = 'REFUND_PENDING')
          AND failure_code IS NOT NULL
          AND length(btrim(failure_code)) > 0
        )
        OR (
          status <> 'FAILED'
          AND stage <> 'REFUND_PENDING'
          AND failure_code IS NULL
        )
      ),

      CONSTRAINT ck_transfers_lease CHECK (
        (lease_token IS NULL) = (lease_expires_at IS NULL)
      ),

      CONSTRAINT ck_transfers_scheduling CHECK (
        (
          status = 'PENDING'
          OR (
            next_attempt_at IS NULL
            AND lease_token IS NULL
            AND lease_expires_at IS NULL
          )
        )
        AND (
          stage <> 'AWAITING_APPROVAL'
          OR (
            next_attempt_at IS NULL
            AND lease_token IS NULL
            AND lease_expires_at IS NULL
          )
        )
      ),

      CONSTRAINT ck_transfers_counts CHECK (
        recovery_attempts >= 0
        AND otp_failed_attempts BETWEEN 0 AND 5
        AND otp_generation BETWEEN 0 AND 4
      ),

      CONSTRAINT ck_transfers_local_accounts CHECK (
        (
          record_side <> 'LOCAL'
          OR status <> 'SUCCEEDED'
          OR (
            source_account_id IS NOT NULL
            AND destination_account_id IS NOT NULL
            AND source_account_id <> destination_account_id
          )
        )
        AND (
          record_side NOT IN ('LOCAL', 'OUTGOING')
          OR status = 'FAILED'
          OR source_account_id IS NOT NULL
        )
        AND (
          record_side <> 'LOCAL'
          OR status = 'FAILED'
          OR destination_account_id IS NOT NULL
        )
      ),

      CONSTRAINT ck_transfers_financial_evidence CHECK (
        (
          stage IN (
            'AWAITING_APPROVAL',
            'AWAITING_EXECUTION',
            'REJECTED'
          )
          AND debit_applied_at IS NULL
          AND credit_applied_at IS NULL
          AND refunded_at IS NULL
        )
        OR (
          stage IN ('SOURCE_DEBITED', 'REFUND_PENDING')
          AND source_account_id IS NOT NULL
          AND debit_applied_at IS NOT NULL
          AND credit_applied_at IS NULL
          AND refunded_at IS NULL
        )
        OR (
          stage = 'COMPLETED'
          AND source_account_id IS NOT NULL
          AND debit_applied_at IS NOT NULL
          AND credit_applied_at IS NOT NULL
          AND refunded_at IS NULL
          AND (
            record_side <> 'LOCAL'
            OR destination_account_id IS NOT NULL
          )
        )
        OR (
          stage = 'REFUNDED'
          AND source_account_id IS NOT NULL
          AND debit_applied_at IS NOT NULL
          AND refunded_at IS NOT NULL
          AND refunded_at >= debit_applied_at
          AND credit_applied_at IS NULL
        )
        OR (
          stage = 'CREDITED'
          AND destination_account_id IS NOT NULL
          AND credit_applied_at IS NOT NULL
          AND debit_applied_at IS NULL
          AND refunded_at IS NULL
        )
      ),

      CONSTRAINT ck_transfers_approval_shape CHECK (
        (
          approval_status = 'NOT_REQUIRED'
          AND approval_requested_at IS NULL
          AND request_expires_at IS NULL
          AND approved_at IS NULL
          AND approved_by_holder_id IS NULL
          AND otp_digest IS NULL
          AND otp_nonce IS NULL
          AND otp_key_id IS NULL
          AND otp_expires_at IS NULL
          AND otp_generation = 0
          AND otp_failed_attempts = 0
        )
        OR (
          approval_status IN (
            'PENDING', 'APPROVED', 'EXPIRED', 'LOCKED'
          )
          AND record_side IN ('LOCAL', 'OUTGOING')
          AND source_account_id IS NOT NULL
          AND approval_requested_at IS NOT NULL
          AND request_expires_at IS NOT NULL
          AND request_expires_at > approval_requested_at
          AND otp_nonce IS NOT NULL
          AND otp_key_id IS NOT NULL
          AND length(btrim(otp_key_id)) > 0
          AND otp_expires_at IS NOT NULL
          AND otp_expires_at > approval_requested_at
          AND otp_expires_at <= request_expires_at
          AND otp_generation BETWEEN 1 AND 4
          AND (
            (
              approval_status = 'PENDING'
              AND status = 'PENDING'
              AND stage = 'AWAITING_APPROVAL'
              AND otp_failed_attempts < 5
              AND otp_digest IS NOT NULL
              AND otp_digest ~ '^[a-f0-9]{64}$'
              AND approved_at IS NULL
              AND approved_by_holder_id IS NULL
              AND debit_applied_at IS NULL
            )
            OR (
              approval_status = 'APPROVED'
              AND approved_at IS NOT NULL
              AND approved_by_holder_id IS NOT NULL
              AND approved_at >= approval_requested_at
              AND approved_at < request_expires_at
              AND otp_digest IS NULL
              AND stage <> 'AWAITING_APPROVAL'
            )
            OR (
              approval_status IN ('EXPIRED', 'LOCKED')
              AND status = 'FAILED'
              AND stage = 'REJECTED'
              AND otp_digest IS NULL
              AND approved_at IS NULL
              AND approved_by_holder_id IS NULL
              AND debit_applied_at IS NULL
            )
          )
        )
      ),

      CONSTRAINT ck_transfers_approval_stage CHECK (
        (
          stage <> 'AWAITING_APPROVAL'
          OR approval_status = 'PENDING'
        )
        AND (
          record_side <> 'INCOMING'
          OR approval_status = 'NOT_REQUIRED'
        )
        AND (
          debit_applied_at IS NULL
          OR approval_status IN ('APPROVED', 'NOT_REQUIRED')
        )
      )
    );
  `);

    await queryRunner.query(`
    CREATE TABLE public.simulated_inbox_messages (
      id UUID PRIMARY KEY,
      recipient_holder_id UUID NOT NULL,
      transfer_id UUID NOT NULL,
      otp_generation INTEGER NOT NULL,

      message_type TEXT NOT NULL DEFAULT 'TRANSFER_APPROVAL',
      message_body TEXT NOT NULL,
      test_otp VARCHAR(6),

      mobile_number_snapshot VARCHAR(32) NOT NULL,
      email_snapshot VARCHAR(254) NOT NULL,

      expires_at TIMESTAMPTZ NOT NULL,
      read_at TIMESTAMPTZ,
      consumed_at TIMESTAMPTZ,
      superseded_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_simulated_inbox_messages_recipient_holder_id
        FOREIGN KEY (recipient_holder_id)
        REFERENCES public.account_holders(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,

      CONSTRAINT fk_simulated_inbox_messages_transfer_id
        FOREIGN KEY (transfer_id)
        REFERENCES public.transfers(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,

      CONSTRAINT ck_simulated_inbox_messages_generation
        CHECK (otp_generation BETWEEN 1 AND 4),

      CONSTRAINT ck_simulated_inbox_messages_type
        CHECK (message_type = 'TRANSFER_APPROVAL'),

      CONSTRAINT ck_simulated_inbox_messages_body
        CHECK (length(btrim(message_body)) > 0),

      CONSTRAINT ck_simulated_inbox_messages_otp
        CHECK (test_otp IS NULL OR test_otp ~ '^[0-9]{6}$'),

      CONSTRAINT ck_simulated_inbox_messages_contacts CHECK (
        mobile_number_snapshot ~ '^[6-9][0-9]{9}$'
        AND length(btrim(email_snapshot)) > 0
      ),

      CONSTRAINT ck_simulated_inbox_messages_expiry
        CHECK (expires_at > created_at),

      CONSTRAINT ck_simulated_inbox_messages_redaction CHECK (
        (consumed_at IS NULL AND superseded_at IS NULL)
        OR test_otp IS NULL
      ),

      CONSTRAINT ck_simulated_inbox_messages_closed
        CHECK (consumed_at IS NULL OR superseded_at IS NULL)
    );
  `);

    await queryRunner.query(`
    CREATE TABLE public.callback_events (
      id UUID PRIMARY KEY,
      transfer_id UUID NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'transfer.completed',
      destination_key VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,

      delivery_status TEXT NOT NULL DEFAULT 'PENDING',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ,
      lease_token UUID,
      lease_expires_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      delivered_at TIMESTAMPTZ,

      CONSTRAINT fk_callback_events_transfer_id
        FOREIGN KEY (transfer_id)
        REFERENCES public.transfers(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,

      CONSTRAINT ck_callback_events_type
        CHECK (event_type = 'transfer.completed'),

      CONSTRAINT ck_callback_events_destination
        CHECK (destination_key ~ '^[A-Za-z0-9._~-]{1,100}$'),

      CONSTRAINT ck_callback_events_payload
        CHECK (jsonb_typeof(payload) = 'object'),

      CONSTRAINT ck_callback_events_status
        CHECK (
          delivery_status IN ('PENDING', 'DELIVERED', 'EXHAUSTED')
        ),

      CONSTRAINT ck_callback_events_count
        CHECK (attempt_count >= 0),

      CONSTRAINT ck_callback_events_lease CHECK (
        (lease_token IS NULL) = (lease_expires_at IS NULL)
      ),

      CONSTRAINT ck_callback_events_schedule CHECK (
        delivery_status = 'PENDING'
        OR (
          next_attempt_at IS NULL
          AND lease_token IS NULL
          AND lease_expires_at IS NULL
        )
      ),

      CONSTRAINT ck_callback_events_delivered CHECK (
        delivery_status <> 'DELIVERED'
        OR delivered_at IS NOT NULL
      )
    );
  `);

    await queryRunner.query(`
    CREATE TABLE public.callback_delivery_attempts (
      id UUID PRIMARY KEY,
      callback_event_id UUID NOT NULL,
      attempt_number INTEGER NOT NULL,
      trigger TEXT NOT NULL,
      status TEXT NOT NULL,

      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMPTZ,
      http_status SMALLINT,
      error_code VARCHAR(64),
      response_excerpt VARCHAR(256),

      CONSTRAINT fk_callback_delivery_attempts_callback_event_id
        FOREIGN KEY (callback_event_id)
        REFERENCES public.callback_events(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,

      CONSTRAINT ck_callback_delivery_attempts_number
        CHECK (attempt_number > 0),

      CONSTRAINT ck_callback_delivery_attempts_trigger
        CHECK (trigger IN ('AUTOMATIC', 'ADMIN_REPLAY')),

      CONSTRAINT ck_callback_delivery_attempts_status CHECK (
        status IN (
          'STARTED', 'DELIVERED', 'HTTP_ERROR', 'TIMEOUT', 'UNKNOWN'
        )
      ),

      CONSTRAINT ck_callback_delivery_attempts_http
        CHECK (
          http_status IS NULL
          OR http_status BETWEEN 100 AND 599
        ),

      CONSTRAINT ck_callback_delivery_attempts_finished CHECK (
        (status = 'STARTED' AND finished_at IS NULL)
        OR (
          status <> 'STARTED'
          AND finished_at IS NOT NULL
          AND finished_at >= started_at
        )
      ),

      CONSTRAINT ck_callback_delivery_attempts_outcome CHECK (
        (
          status = 'STARTED'
          AND http_status IS NULL
          AND error_code IS NULL
          AND response_excerpt IS NULL
        )
        OR (
          status = 'DELIVERED'
          AND http_status IS NOT NULL
          AND http_status BETWEEN 200 AND 299
        )
        OR (
          status = 'HTTP_ERROR'
          AND (
            http_status IS NULL
            OR http_status NOT BETWEEN 200 AND 299
          )
        )
        OR (
          status IN ('TIMEOUT', 'UNKNOWN')
          AND http_status IS NULL
        )
      )
    );
  `);

    await queryRunner.query(`
    CREATE TABLE public.simulation_rules (
      id UUID PRIMARY KEY,
      client_id VARCHAR(100) NOT NULL,
      client_request_id VARCHAR(128) NOT NULL,

      scenario TEXT NOT NULL,
      parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by VARCHAR(100) NOT NULL,

      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      resumed_at TIMESTAMPTZ,
      resumed_by VARCHAR(100),

      CONSTRAINT ck_simulation_rules_target CHECK (
        length(btrim(client_id)) > 0
        AND client_request_id ~ '^[A-Za-z0-9._~-]{1,128}$'
      ),

      CONSTRAINT ck_simulation_rules_scenario CHECK (
        scenario IN (
          'NORMAL',
          'BUSINESS_REJECT',
          'INSUFFICIENT_FUNDS',
          'DELAY_BEFORE_EXECUTION',
          'TIMEOUT_BEFORE_ACCEPTANCE',
          'TIMEOUT_AFTER_COMMIT',
          'PROVIDER_UNAVAILABLE',
          'PAUSE_AFTER_SOURCE_DEBIT',
          'LOSE_DESTINATION_REPLY',
          'DUPLICATE_CALLBACK',
          'FAIL_CALLBACK_ONCE',
          'DELAY_CALLBACK'
        )
      ),

      CONSTRAINT ck_simulation_rules_parameters
        CHECK (jsonb_typeof(parameters) = 'object'),

      CONSTRAINT ck_simulation_rules_creator
        CHECK (length(btrim(created_by)) > 0),

      CONSTRAINT ck_simulation_rules_expiry
        CHECK (expires_at > created_at),

      CONSTRAINT ck_simulation_rules_resume CHECK (
        (resumed_at IS NULL AND resumed_by IS NULL)
        OR (
          resumed_at IS NOT NULL
          AND resumed_by IS NOT NULL
          AND length(btrim(resumed_by)) > 0
          AND consumed_at IS NOT NULL
          AND resumed_at >= consumed_at
        )
      )
    );
  `);

    await queryRunner.query(`
    CREATE UNIQUE INDEX uq_transfer_request
      ON public.transfers (client_id, client_request_id)
      WHERE record_side IN ('LOCAL', 'OUTGOING');

    CREATE UNIQUE INDEX uq_transfer_network
      ON public.transfers (network_transfer_id);

    CREATE INDEX ix_transfer_recovery
      ON public.transfers (next_attempt_at, id)
      WHERE status = 'PENDING'
        AND record_side IN ('LOCAL', 'OUTGOING');

    CREATE INDEX ix_transfer_client_history
      ON public.transfers (client_id, created_at DESC, id);

    CREATE INDEX ix_transfer_approval_expiry
      ON public.transfers (request_expires_at, id)
      WHERE status = 'PENDING'
        AND stage = 'AWAITING_APPROVAL';

    CREATE INDEX ix_transfer_source_account
      ON public.transfers (source_account_id)
      WHERE source_account_id IS NOT NULL;

    CREATE INDEX ix_transfer_destination_account
      ON public.transfers (destination_account_id)
      WHERE destination_account_id IS NOT NULL;

    CREATE INDEX ix_transfer_approved_holder
      ON public.transfers (approved_by_holder_id)
      WHERE approved_by_holder_id IS NOT NULL;

    CREATE UNIQUE INDEX uq_inbox_challenge
      ON public.simulated_inbox_messages (transfer_id, otp_generation);

    CREATE INDEX ix_inbox_recipient
      ON public.simulated_inbox_messages
        (recipient_holder_id, created_at DESC, id);

    CREATE UNIQUE INDEX uq_callback_final_event
      ON public.callback_events (transfer_id);

    CREATE INDEX ix_callback_due
      ON public.callback_events (next_attempt_at, id)
      WHERE delivery_status = 'PENDING';

    CREATE UNIQUE INDEX uq_callback_attempt
      ON public.callback_delivery_attempts
        (callback_event_id, attempt_number);

    CREATE UNIQUE INDEX uq_simulation_request
      ON public.simulation_rules (client_id, client_request_id);
  `);

    // Reuse the function created by your existing core migration.
    for (const table of [
      'transfers',
      'simulated_inbox_messages',
      'callback_events',
    ]) {
      await queryRunner.query(`
      CREATE TRIGGER ${table}_set_updated_at
      BEFORE UPDATE ON public.${table}
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
    `);
    }

    await queryRunner.query(`
      CREATE MATERIALIZED VIEW public.simulator_schema_migrations AS
      SELECT name, timestamp
      FROM public.typeorm_migrations
      WITH NO DATA
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON public.simulator_schema_migrations
      FROM PUBLIC, "${appRole}"
    `);

    await queryRunner.query(`
      GRANT SELECT
      ON public.simulator_schema_migrations
      TO "${appRole}"
    `);

    // Startup needs these two live columns to detect a missed refresh.
    // The application receives no INSERT, UPDATE or DELETE permission.
    await queryRunner.query(`
      REVOKE ALL
      ON public.typeorm_migrations
      FROM PUBLIC, "${appRole}"
   `);

    await queryRunner.query(`
      GRANT SELECT (name, timestamp)
      ON public.typeorm_migrations
      TO "${appRole}"
    `);
    // The app can operate workflows, but cannot delete their history.
    for (const table of [
      'transfers',
      'simulated_inbox_messages',
      'callback_events',
      'callback_delivery_attempts',
      'simulation_rules',
    ]) {
      await queryRunner.query(`
      REVOKE ALL
        ON public.${table}
        FROM PUBLIC, "${appRole}";

      GRANT SELECT, INSERT, UPDATE
        ON public.${table}
        TO "${appRole}";
    `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // A normal rollback must not discard financial or delivery history.
    await queryRunner.query(`
      LOCK TABLE
        public.transfers,
        public.simulated_inbox_messages,
        public.callback_events,
        public.callback_delivery_attempts,
        public.simulation_rules
      IN ACCESS EXCLUSIVE MODE;

      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.transfers)
          OR EXISTS (SELECT 1 FROM public.simulated_inbox_messages)
          OR EXISTS (SELECT 1 FROM public.callback_events)
          OR EXISTS (SELECT 1 FROM public.callback_delivery_attempts)
          OR EXISTS (SELECT 1 FROM public.simulation_rules)
        THEN
          RAISE EXCEPTION
            'Rollback refused: workflow tables contain data.';
        END IF;
      END;
      $$;

      DROP MATERIALIZED VIEW public.simulator_schema_migrations;
      DROP TABLE public.callback_delivery_attempts;
      DROP TABLE public.callback_events;
      DROP TABLE public.simulated_inbox_messages;
      DROP TABLE public.simulation_rules;
      DROP TABLE public.transfers;
    `);
  }
}
