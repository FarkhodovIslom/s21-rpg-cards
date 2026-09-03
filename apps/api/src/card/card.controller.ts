import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, requireUserId } from '../auth/session.guard.js';
import type { AuthenticatedRequest } from '../auth/session.guard.js';
import { CardService } from './card.service.js';
import type { CardResponse } from 'shared-types';

@Controller('api/me')
@UseGuards(SessionGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get('card')
  getCard(@Req() request: AuthenticatedRequest): Promise<CardResponse> {
    return this.cardService.getOwnCard(requireUserId(request));
  }
}
