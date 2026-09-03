import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service.js';
import type { CardResponse } from 'shared-types';
import { deriveDomainRank } from '../derivation/domain-rank.js';

const EXP_HISTORY_LIMIT = 50;

@Injectable()
export class CardService {
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const ttlMinutes = Number(configService.get('SYNC_TTL_MINUTES')) || 15;
    this.ttlMs = ttlMinutes * 60_000;
  }

  async getOwnCard(userId: string): Promise<CardResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const participant = await this.prisma.participant.findUnique({
      where: { login: user.login },
      include: {
        skills: true,
        badges: true,
        points: true,
        feedback: true,
        expHistory: { orderBy: { date: 'desc' }, take: EXP_HISTORY_LIMIT },
      },
    });
    if (!participant) {
      throw new NotFoundException(
        'Card data has not been synced yet for this account',
      );
    }

    const lastSyncedAt = participant.lastSyncedAt ?? new Date(0);

    return {
      login: participant.login,
      className: participant.className,
      parallelName: participant.parallelName,
      expValue: participant.expValue,
      level: participant.level,
      expToNextLevel: participant.expToNextLevel,
      campusId: participant.campusId,
      status: participant.status,
      logtime: participant.logtime,
      lastSyncedAt: lastSyncedAt.toISOString(),
      stale: Date.now() - lastSyncedAt.getTime() > this.ttlMs,
      skills: participant.skills.map((skill) => ({
        name: skill.name,
        value: skill.value,
      })),
      domainRank: deriveDomainRank(
        participant.skills.map((skill) => ({ name: skill.name, value: skill.value })),
      ),
      badges: participant.badges.map((badge) => ({
        name: badge.name,
        receiptDate: badge.receiptDate.toISOString(),
        iconUrl: badge.iconUrl,
      })),
      points: participant.points
        ? {
            prp: participant.points.prp,
            crp: participant.points.crp,
            coins: participant.points.coins,
          }
        : null,
      feedback: participant.feedback
        ? {
            punctuality: participant.feedback.punctuality,
            interest: participant.feedback.interest,
            thoroughness: participant.feedback.thoroughness,
            friendliness: participant.feedback.friendliness,
          }
        : null,
      expHistory: participant.expHistory.map((entry) => ({
        amount: entry.amount,
        date: entry.date.toISOString(),
      })),
    };
  }
}
