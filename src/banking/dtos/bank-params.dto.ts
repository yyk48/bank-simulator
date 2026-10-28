import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';
import { BANK_CODES } from '../../database/bank-code.js';
import type { BankCode } from '../../database/bank-code.js';

export class BankParamsDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(BANK_CODES, {
    message: 'bank must be ICICI, HDFC, or SBI',
  })
  bank!: BankCode;
}
