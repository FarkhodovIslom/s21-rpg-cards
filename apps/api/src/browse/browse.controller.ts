import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, requireUserId } from '../auth/session.guard.js';
import type { AuthenticatedRequest } from '../auth/session.guard.js';
import { BrowseService } from './browse.service.js';
import type {
  CampusListResponse,
  CoalitionListResponse,
  ParticipantLoginsResponse,
} from 'shared-types';

@Controller('api')
@UseGuards(SessionGuard)
export class BrowseController {
  constructor(private readonly browseService: BrowseService) {}

  @Get('campuses')
  listCampuses(
    @Req() request: AuthenticatedRequest,
  ): Promise<CampusListResponse> {
    return this.browseService.listCampuses(requireUserId(request));
  }

  @Get('campuses/:campusId/coalitions')
  listCampusCoalitions(
    @Req() request: AuthenticatedRequest,
    @Param('campusId') campusId: string,
  ): Promise<CoalitionListResponse> {
    return this.browseService.listCampusCoalitions(
      requireUserId(request),
      campusId,
    );
  }

  @Get('coalitions/:coalitionId/participants')
  listCoalitionParticipants(
    @Req() request: AuthenticatedRequest,
    @Param('coalitionId') coalitionId: string,
  ): Promise<ParticipantLoginsResponse> {
    return this.browseService.listCoalitionParticipants(
      requireUserId(request),
      coalitionId,
    );
  }
}
