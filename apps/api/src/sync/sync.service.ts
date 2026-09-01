import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AuthService } from '../auth/auth.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { School21ClientService } from '../school21/school21-client.service.js';
import type { SchoolParticipant } from '../school21/types.js';

export type SyncResult = {
  login: string;
  status: 'synced' | 'skipped' | 'failed';
  error?: string;
};

const DEFAULT_CRON = '0 */10 * * * *';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private readonly ttlMs: number;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly school21: School21ClientService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    const ttlMinutes = Number(configService.get('SYNC_TTL_MINUTES')) || 15;
    this.ttlMs = ttlMinutes * 60_000;
  }

  onModuleInit(): void {
    // Registered dynamically instead of the @Cron decorator: env vars are not
    // loaded at decorator-evaluation time (ConfigModule reads .env during
    // module init, after import-time decorator evaluation).
    // Verified against @nestjs/schedule@12 (scheduler.registry.js): there is
    // no addCronTask(name, expr, fn); the v12 API is addCronJob(name, job),
    // which only registers the job and does NOT auto-start it. So the CronJob
    // is built from the 'cron' package and started explicitly right here.
    const cronExpr =
      this.configService.get<string>('SYNC_CRON') ?? DEFAULT_CRON;
    const job = new CronJob(cronExpr, () => {
      void this.runOnce();
    });
    this.schedulerRegistry.addCronJob('school21-sync', job);
    job.start();
    this.logger.log('Scheduled school21 sync with cron "' + cronExpr + '"');
  }

  async runOnce(force = false): Promise<SyncResult[]> {
    if (this.isRunning) {
      this.logger.warn('Sync already in progress - skipping this run');
      return [];
    }
    this.isRunning = true;
    try {
      const users = await this.prisma.user.findMany();
      const results: SyncResult[] = [];
      for (const user of users) {
        // Sequential per user (rate-limit pacing on the school API);
        // one user's failure must not stop the rest.
        results.push(
          await this.syncUser({ id: user.id, login: user.login }, force),
        );
      }
      return results;
    } catch (error) {
      this.logger.error(
        'Sync run failed: ' +
          (error instanceof Error ? error.message : 'unknown error'),
      );
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  async syncUser(
    user: { id: string; login: string },
    force = false,
  ): Promise<SyncResult> {
    // 1. Token keepalive: refresh on EVERY run, decoupled from the data TTL
    //    (offline refresh token must be used at least once within Keycloak's
    //    offline session idle window, even when cached data is still fresh).
    const tokens = await this.authService
      .refreshUserToken(user.id)
      .catch(() => null);
    if (!tokens) {
      return {
        login: user.login,
        status: 'failed',
        error: 'token refresh failed',
      };
    }
    const accessToken = tokens.access_token;

    // 2. TTL check (skipped when forced).
    if (!force) {
      const existing = await this.prisma.participant.findUnique({
        where: { login: user.login },
        select: { lastSyncedAt: true },
      });
      if (
        existing?.lastSyncedAt &&
        Date.now() - existing.lastSyncedAt.getTime() < this.ttlMs
      ) {
        return { login: user.login, status: 'skipped' };
      }
    }

    try {
      // 3. Fetch all endpoints SEQUENTIALLY - no parallelism (rate limiting).
      const participant: SchoolParticipant = await this.school21.getParticipant(
        user.login,
        accessToken,
      );
      const skills = await this.school21.getSkills(user.login, accessToken);
      const badges = await this.school21.getBadges(user.login, accessToken);
      const points = await this.school21.getPoints(user.login, accessToken);
      const feedback = await this.school21.getFeedback(user.login, accessToken);
      const logtime = await this.school21.getLogtime(user.login, accessToken);
      const expHistory = await this.school21.getExperienceHistory(
        user.login,
        accessToken,
      );

      const campusId =
        typeof participant.campus === 'string'
          ? participant.campus
          : participant.campus.id;
      const now = new Date();

      // 4. Single transaction - the DB mirrors the API (delete + recreate
      //    child rows; upsert root rows). Atomic: readers never see a
      //    half-synced card.
      await this.prisma.$transaction(async (tx) => {
        const profile = {
          className: participant.className,
          parallelName: participant.parallelName,
          expValue: participant.expValue,
          level: participant.level,
          expToNextLevel: participant.expToNextLevel,
          campusId,
          status: participant.status,
          logtime,
          lastSyncedAt: now,
        };
        await tx.participant.upsert({
          where: { login: participant.login },
          create: { login: participant.login, ...profile },
          update: profile,
        });

        await tx.skill.deleteMany({
          where: { participantLogin: participant.login },
        });
        if (skills.length > 0) {
          await tx.skill.createMany({
            data: skills.map((s) => ({
              name: s.name,
              value: s.value,
              participantLogin: participant.login,
            })),
          });
        }

        await tx.badge.deleteMany({
          where: { participantLogin: participant.login },
        });
        if (badges.length > 0) {
          await tx.badge.createMany({
            data: badges.map((b) => ({
              name: b.name,
              receiptDate: new Date(b.receiptDate),
              participantLogin: participant.login,
            })),
          });
        }

        await tx.expEntry.deleteMany({
          where: { participantLogin: participant.login },
        });
        if (expHistory.length > 0) {
          await tx.expEntry.createMany({
            data: expHistory.map((e) => ({
              amount: e.amount,
              date: new Date(e.date),
              participantLogin: participant.login,
            })),
          });
        }

        await tx.points.upsert({
          where: { participantLogin: participant.login },
          create: {
            participantLogin: participant.login,
            prp: points.PRP,
            crp: points.CRP,
            coins: points.Coins,
          },
          update: { prp: points.PRP, crp: points.CRP, coins: points.Coins },
        });

        await tx.feedback.upsert({
          where: { participantLogin: participant.login },
          create: {
            participantLogin: participant.login,
            punctuality: feedback.punctuality,
            interest: feedback.interest,
            thoroughness: feedback.thoroughness,
            friendliness: feedback.friendliness,
          },
          update: {
            punctuality: feedback.punctuality,
            interest: feedback.interest,
            thoroughness: feedback.thoroughness,
            friendliness: feedback.friendliness,
          },
        });
      });

      return { login: user.login, status: 'synced' };
    } catch (error) {
      // Normalized failure - never propagate raw school API/axios errors upward.
      return {
        login: user.login,
        status: 'failed',
        error: error instanceof Error ? error.message : 'unknown sync error',
      };
    }
  }
}
