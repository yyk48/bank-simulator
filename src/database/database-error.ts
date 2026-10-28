const UNAVAILABLE_CODES = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '57P01',
  '57P02',
  '57P03',
  '53300',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'EPIPE',
]);
const TEMPORARY_CODES = new Set(['57014', '55P03']);

export function databaseFailureCode(
  error: unknown,
): 'BANK_UNAVAILABLE' | 'TEMPORARILY_UNAVAILABLE' | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof error.code === 'string') {
    if (UNAVAILABLE_CODES.has(error.code)) return 'BANK_UNAVAILABLE';
    if (TEMPORARY_CODES.has(error.code)) return 'TEMPORARILY_UNAVAILABLE';
  }
  // TypeORM wraps PostgreSQL errors in QueryFailedError.driverError.
  if ('driverError' in error && error.driverError !== error) {
    const driver: unknown = error.driverError;
    if (
      typeof driver === 'object' &&
      driver !== null &&
      'code' in driver &&
      typeof driver.code === 'string'
    ) {
      if (UNAVAILABLE_CODES.has(driver.code)) return 'BANK_UNAVAILABLE';
      if (TEMPORARY_CODES.has(driver.code)) return 'TEMPORARILY_UNAVAILABLE';
    }
  }
  return undefined;
}
