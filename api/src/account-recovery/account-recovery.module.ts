import { Module } from '@nestjs/common';
import { AccountRecoveryController } from './account-recovery.controller.js';

@Module({
  controllers: [AccountRecoveryController],
})
export class AccountRecoveryModule {}
