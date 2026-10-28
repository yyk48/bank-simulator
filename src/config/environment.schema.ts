import Joi from 'joi';
import { BANKS } from '../database/bank-code.js';

// Validate external configuration before starting the HTTP server.
export const environmentSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  HOST: Joi.string().ip().default('127.0.0.1'),
  VAULT_ADDR: Joi.string().uri().required(),

  // DB_HOST: Joi.string().trim().min(1).required(),
  // DB_PORT: Joi.number().integer().min(1).max(65535).required(),

  // ICICI_DB_PASSWORD: Joi.string().min(1).required(),
  // HDFC_DB_PASSWORD: Joi.string().min(1).required(),
  // SBI_DB_PASSWORD: Joi.string().min(1).required(),

  // ICICI_DB_MIGRATION_PASSWORD: Joi.string().min(1).optional(),
  // HDFC_DB_MIGRATION_PASSWORD: Joi.string().min(1).optional(),
  // SBI_DB_MIGRATION_PASSWORD: Joi.string().min(1).optional(),

  MIGRATION_BANK: Joi.string()
    .valid(...BANKS)
    .optional(),
});
