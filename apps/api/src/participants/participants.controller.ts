import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, requireUserId } from '../auth/session.guard.js';
import type { AuthenticatedRequest } from '../auth/session.guard.js';
import { ParticipantsService } from './participants.service.js';
import type { ParticipantSearchResponse } from 'shared-types';

@Controller('api/participants')
@UseGuards(SessionGuard)
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get(':login')
  findByLogin(
    @Req() request: AuthenticatedRequest,
    @Param('login') login: string,
  ): Promise<ParticipantSearchResponse> {
    return this.participantsService.findByLogin(requireUserId(request), login);
  }
}
