import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CardController } from './card.controller.js';
import { CardService } from './card.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CardController],
  providers: [CardService],
})
export class CardModule {}
