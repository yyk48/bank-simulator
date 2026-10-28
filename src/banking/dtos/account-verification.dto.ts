import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AccountVerificationDto {
  @ApiProperty({
    description: 'Bank account number to verify.',
    example: '480750250482',
    pattern: '^[0-9]{1,32}$',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^[0-9]{1,32}$/, {
    message: 'accountNumber must contain between 1 and 32 digits',
  })
  accountNumber!: string;

  @ApiProperty({
    description: 'IFSC code supplied for the bank account.',
    example: 'ICIC0000001',
    pattern: '^[A-Z]{4}0[A-Z0-9]{6}$',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'ifsc must be a valid 11-character uppercase IFSC',
  })
  ifsc!: string;

  @ApiProperty({
    description:
      'Expected owner tax identifier. The simulator currently models PAN format.',
    example: 'ABCDE1234F',
    pattern: '^[A-Z]{5}[0-9]{4}[A-Z]$',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
    message: 'expectedOwnerTaxIdRef must be in uppercase PAN format',
  })
  expectedOwnerTaxIdRef!: string;
}
