import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { School21ClientService } from '../school21/school21-client.service.js';
import type {
  CampusListResponse,
  CoalitionListResponse,
  ParticipantLoginsResponse,
} from 'shared-types';

@Injectable()
export class BrowseService {
  constructor(
    private readonly authService: AuthService,
    private readonly school21: School21ClientService,
  ) {}

  async listCampuses(requesterId: string): Promise<CampusListResponse> {
    const { access_token: accessToken } =
      await this.authService.refreshUserToken(requesterId);
    const campuses = await this.school21.getCampuses(accessToken);
    return {
      campuses: campuses.map((campus) => ({
        id: campus.id,
        shortName: campus.shortName,
        fullName: campus.fullName,
      })),
    };
  }

  async listCampusCoalitions(
    requesterId: string,
    campusId: string,
  ): Promise<CoalitionListResponse> {
    const { access_token: accessToken } =
      await this.authService.refreshUserToken(requesterId);
    const coalitions = await this.school21.getCampusCoalitions(
      campusId,
      accessToken,
    );
    return {
      coalitions: coalitions.map((coalition) => ({
        coalitionId: coalition.coalitionId,
        name: coalition.name,
      })),
    };
  }

  async listCoalitionParticipants(
    requesterId: string,
    coalitionId: string,
  ): Promise<ParticipantLoginsResponse> {
    const { access_token: accessToken } =
      await this.authService.refreshUserToken(requesterId);
    const participants = await this.school21.getCoalitionParticipants(
      coalitionId,
      accessToken,
    );
    return { participants };
  }
}
