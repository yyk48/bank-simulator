import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BANKS } from './database/bank-code.js';
import { createBankDataSourceOptions } from './database/bank-data-source.options.js';
import { environmentSchema } from './config/environment.schema.js';
import { HealthController } from './health/health.controller.js';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { BankingModule } from './banking/banking.module.js';
import { DatabaseModule } from './database/database.module.js';
import { ServiceAccessModule } from './service-access/service-access.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: environmentSchema,
      validationOptions: {
        libraryOptions: {
          allowUnknown: true,
          abortEarly: false,
        },
      },
    }),
    ...BANKS.map((bank) =>
      TypeOrmModule.forRootAsync({
        name: bank,
        // imports: [ConfigModule],
        // inject: [ConfigService],

        useFactory: () => createBankDataSourceOptions(bank, 'app'),
      }),
    ),
    ServiceAccessModule,
    BankingModule,
    DatabaseModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
