import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { School21ClientService } from '../school21/school21-client.service.js';
import type { SchoolParticipant } from '../school21/types.js';
import type { ParticipantSearchResponse } from 'shared-types';
import { deriveDomainRank } from '../derivation/domain-rank.js';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly authService: AuthService,
    private readonly school21: School21ClientService,
  ) {}

  async findByLogin(
    requesterId: string,
    login: string,
  ): Promise<ParticipantSearchResponse> {
    const { access_token: accessToken } =
      await this.authService.refreshUserToken(requesterId);

    let participant: SchoolParticipant;
    try {
      participant = await this.school21.getParticipant(login, accessToken);
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('(404)')) {
        throw new NotFoundException(`Participant '${login}' was not found`);
      }
      throw error;
    }

    const skills = await this.school21.getSkills(login, accessToken);
    const badges = await this.school21.getBadges(login, accessToken);
    const points = await this.school21.getPoints(login, accessToken);
    const feedback = await this.school21.getFeedback(login, accessToken);
    const logtime = await this.school21.getLogtime(login, accessToken);
    const expHistory = await this.school21.getExperienceHistory(
      login,
      accessToken,
    );

    const rawSkills = skills.map((skill) => ({
      name: skill.name,
      value: skill.points,
    }));

    return {
      login: participant.login,
      className: participant.className,
      parallelName: participant.parallelName,
      expValue: participant.expValue,
      level: participant.level,
      expToNextLevel: participant.expToNextLevel,
      campusId: participant.campus.id,
      status: participant.status,
      logtime,
      skills: rawSkills,
      domainRank: deriveDomainRank(rawSkills),
      badges: badges.map((badge) => ({
        name: badge.name,
        receiptDate: badge.receiptDateTime,
        iconUrl: badge.iconUrl,
      })),
      points: {
        prp: points.peerReviewPoints,
        crp: points.codeReviewPoints,
        coins: points.coins,
      },
      feedback: {
        punctuality: feedback.averageVerifierPunctuality,
        interest: feedback.averageVerifierInterest,
        thoroughness: feedback.averageVerifierThoroughness,
        friendliness: feedback.averageVerifierFriendliness,
      },
      expHistory: expHistory.map((entry) => ({
        amount: entry.expValue,
        date: entry.accrualDateTime,
      })),
    };
  }
}
