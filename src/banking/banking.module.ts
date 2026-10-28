import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { BankingController } from './banking.controller.js';
import { BankingRepository } from './banking.repository.js';
import { BankingService } from './banking.service.js';
import { ServiceAccessModule } from '../service-access/service-access.module.js';

@Module({
  imports: [DatabaseModule, ServiceAccessModule],
  controllers: [BankingController],
  providers: [BankingService, BankingRepository],
  exports: [BankingService],
})
export class BankingModule {}
