import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { School21Module } from '../school21/school21.module.js';
import { ParticipantsController } from './participants.controller.js';
import { ParticipantsService } from './participants.service.js';

@Module({
  imports: [AuthModule, School21Module],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
})
export class ParticipantsModule {}
