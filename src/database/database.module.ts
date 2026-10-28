import { Module } from '@nestjs/common';
import { BankConnectionManager } from './bank-connection-manager.js';

@Module({
  providers: [BankConnectionManager],
  exports: [BankConnectionManager],
})
export class DatabaseModule {}
