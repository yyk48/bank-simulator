import { DataSource } from 'typeorm';

import { BANKS } from './bank-code.js';
import { createBankDataSourceOptions } from './bank-data-source.options.js';

const bank = BANKS.find(
  (candidate) => candidate === process.env['MIGRATION_BANK'],
);

if (bank === undefined) {
  throw new Error('MIGRATION_BANK must be icici, hdfc or sbi.');
}

const options = await createBankDataSourceOptions(bank, 'migrator');

export default new DataSource(options);
