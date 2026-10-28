import type { DataSource } from 'typeorm';

type MigrationRecord = {
  name: string;
  timestamp: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstRow(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value) || !isRecord(value[0])) {
    throw new Error('Invalid schema-check query result.');
  }

  return value[0];
}

function migrationKey(record: MigrationRecord): string {
  return `${record.timestamp}:${record.name}`;
}

export async function refreshSchemaHistory(
  source: DataSource,
  allowMissing = false,
): Promise<void> {
  const result: unknown = await source.query(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_matviews
      WHERE schemaname = 'public'
        AND matviewname = 'simulator_schema_migrations'
    ) AS present
  `);

  const row = firstRow(result);

  if (row['present'] !== true) {
    // Reverting the migration that creates the materialized view
    // legitimately removes it.
    if (allowMissing && row['present'] === false) {
      return;
    }

    throw new Error('Schema-history materialized view is missing.');
  }

  // Executes using the migrator credentials.
  await source.query(`
    REFRESH MATERIALIZED VIEW public.simulator_schema_migrations
  `);
}

export async function assertBankSchemaCompatible(
  source: DataSource,
): Promise<void> {
  if (!source.isInitialized) {
    throw new Error('Bank database is not initialized.');
  }

  // These are the migrations packaged with this application build.
  const expected = new Set<string>();

  for (const migration of source.migrations) {
    const name = migration.name ?? migration.constructor.name;
    const timestamp = name.slice(-13);

    if (!/^\d{13}$/.test(timestamp)) {
      throw new Error('Invalid packaged migration name.');
    }

    const key = migrationKey({ name, timestamp });

    if (expected.has(key)) {
      throw new Error('Duplicate packaged migration.');
    }

    expected.add(key);
  }

  if (expected.size === 0) {
    throw new Error('No application migrations were loaded.');
  }

  // One SQL statement gives both reads the same statement snapshot.
  // Comparing in both directions detects missed run AND revert refreshes.
  const result: unknown = await source.query(`
    SELECT
      (
        NOT EXISTS (
          SELECT name, timestamp
          FROM public.typeorm_migrations
          EXCEPT
          SELECT name, timestamp
          FROM public.simulator_schema_migrations
        )
        AND
        NOT EXISTS (
          SELECT name, timestamp
          FROM public.simulator_schema_migrations
          EXCEPT
          SELECT name, timestamp
          FROM public.typeorm_migrations
        )
      ) AS is_current,

      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'name', name,
              'timestamp', timestamp::text
            )
          )
          FROM public.simulator_schema_migrations
        ),
        '[]'::jsonb
      ) AS migrations
  `);

  const row = firstRow(result);

  if (row['is_current'] !== true) {
    throw new Error(
      'Schema-history snapshot is stale. Run the refresh command.',
    );
  }

  const records: unknown = row['migrations'];

  if (!Array.isArray(records)) {
    throw new Error('Invalid schema-history snapshot.');
  }

  const actual = new Set<string>();

  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record['name'] !== 'string' ||
      typeof record['timestamp'] !== 'string'
    ) {
      throw new Error('Invalid schema-history migration record.');
    }

    actual.add(
      migrationKey({
        name: record['name'],
        timestamp: record['timestamp'],
      }),
    );
  }

  if (
    actual.size !== records.length ||
    actual.size !== expected.size ||
    [...expected].some((key) => !actual.has(key))
  ) {
    throw new Error('Database migrations do not match this application build.');
  }
}
