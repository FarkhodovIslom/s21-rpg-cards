import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { School21Module } from '../school21/school21.module.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

@Module({
  imports: [AuthModule, School21Module],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
