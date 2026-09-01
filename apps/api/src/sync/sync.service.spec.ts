import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AuthService } from '../auth/auth.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { School21ClientService } from '../school21/school21-client.service.js';
import { SyncService } from './sync.service.js';

describe('SyncService', () => {
  let service: SyncService;

  const txMock = {
    participant: { upsert: jest.fn() },
    skill: { deleteMany: jest.fn(), createMany: jest.fn() },
    badge: { deleteMany: jest.fn(), createMany: jest.fn() },
    expEntry: { deleteMany: jest.fn(), createMany: jest.fn() },
    points: { upsert: jest.fn() },
    feedback: { upsert: jest.fn() },
  };

  const prismaMock = {
    user: { findMany: jest.fn() },
    participant: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: typeof txMock) => Promise<unknown>) =>
      fn(txMock),
    ),
  };

  const authServiceMock = { refreshUserToken: jest.fn() };

  const school21Mock = {
    getParticipant: jest.fn(),
    getSkills: jest.fn(),
    getBadges: jest.fn(),
    getPoints: jest.fn(),
    getFeedback: jest.fn(),
    getLogtime: jest.fn(),
    getExperienceHistory: jest.fn(),
  };

  const schedulerRegistryMock = {
    addCronJob: jest.fn(),
    getCronJob: jest.fn(),
  };

  const mockUser = {
    id: 'u1',
    login: 'testuser',
    encryptedRefreshToken: 'x',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const participantFixture = {
    login: 'testuser',
    className: '21',
    parallelName: 'P1',
    expValue: 1000,
    level: 5,
    expToNextLevel: 500,
    campus: 'campus-1',
    status: 'STUDENT',
  };

  const skillsFixture = [{ name: 'Algorithms', points: 42 }];
  const badgesFixture = [
    {
      name: 'Warrior',
      receiptDateTime: '2024-05-01T00:00:00.000Z',
      iconUrl: 'https://example.com/warrior.png',
    },
  ];
  const pointsFixture = { PRP: 10, CRP: 20, Coins: 30 };
  const feedbackFixture = {
    punctuality: 4.5,
    interest: 4,
    thoroughness: 3.5,
    friendliness: 5,
  };
  const logtimeFixture = 12.5;
  const expHistoryFixture = [{ amount: 50, date: '2024-05-01T10:00:00.000Z' }];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                SYNC_TTL_MINUTES: '15',
                SYNC_CRON: '0 */10 * * * *',
              };
              return map[key];
            }),
          },
        },
        { provide: AuthService, useValue: authServiceMock },
        { provide: School21ClientService, useValue: school21Mock },
        { provide: SchedulerRegistry, useValue: schedulerRegistryMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    jest.clearAllMocks();

    authServiceMock.refreshUserToken.mockResolvedValue({
      access_token: 'access-token',
    });
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.participant.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
    );
    school21Mock.getParticipant.mockResolvedValue(participantFixture);
    school21Mock.getSkills.mockResolvedValue(skillsFixture);
    school21Mock.getBadges.mockResolvedValue(badgesFixture);
    school21Mock.getPoints.mockResolvedValue(pointsFixture);
    school21Mock.getFeedback.mockResolvedValue(feedbackFixture);
    school21Mock.getLogtime.mockResolvedValue(logtimeFixture);
    school21Mock.getExperienceHistory.mockResolvedValue(expHistoryFixture);
    for (const model of Object.values(txMock)) {
      for (const fn of Object.values(model)) {
        fn.mockResolvedValue({});
      }
    }
  });

  it('syncs a fresh user end-to-end in one transaction', async () => {
    const result = await service.syncUser({ id: 'u1', login: 'testuser' });

    expect(result).toEqual({ login: 'testuser', status: 'synced' });
    expect(authServiceMock.refreshUserToken).toHaveBeenCalledWith('u1');
    expect(school21Mock.getParticipant).toHaveBeenCalledTimes(1);
    expect(school21Mock.getSkills).toHaveBeenCalledTimes(1);
    expect(school21Mock.getBadges).toHaveBeenCalledTimes(1);
    expect(school21Mock.getPoints).toHaveBeenCalledTimes(1);
    expect(school21Mock.getFeedback).toHaveBeenCalledTimes(1);
    expect(school21Mock.getLogtime).toHaveBeenCalledTimes(1);
    expect(school21Mock.getExperienceHistory).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    expect(txMock.participant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { login: 'testuser' },
        create: expect.objectContaining({
          login: 'testuser',
          className: '21',
          parallelName: 'P1',
          expValue: 1000,
          level: 5,
          expToNextLevel: 500,
          campusId: 'campus-1',
          status: 'STUDENT',
          logtime: 12.5,
          lastSyncedAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          campusId: 'campus-1',
          lastSyncedAt: expect.any(Date),
        }),
      }),
    );
    expect(txMock.skill.deleteMany).toHaveBeenCalledWith({
      where: { participantLogin: 'testuser' },
    });
    expect(txMock.skill.createMany).toHaveBeenCalledWith({
      data: [{ name: 'Algorithms', value: 42, participantLogin: 'testuser' }],
    });
    expect(txMock.badge.deleteMany).toHaveBeenCalledWith({
      where: { participantLogin: 'testuser' },
    });
    expect(txMock.badge.createMany).toHaveBeenCalledWith({
      data: [
        {
          name: 'Warrior',
          receiptDate: new Date('2024-05-01T00:00:00.000Z'),
          iconUrl: 'https://example.com/warrior.png',
          participantLogin: 'testuser',
        },
      ],
    });
    const badgeCall = txMock.badge.createMany.mock.calls[0][0];
    expect(badgeCall.data[0].receiptDate).toBeInstanceOf(Date);
    expect(txMock.expEntry.deleteMany).toHaveBeenCalledWith({
      where: { participantLogin: 'testuser' },
    });
    expect(txMock.expEntry.createMany).toHaveBeenCalledWith({
      data: [
        {
          amount: 50,
          date: new Date('2024-05-01T10:00:00.000Z'),
          participantLogin: 'testuser',
        },
      ],
    });
    const expCall = txMock.expEntry.createMany.mock.calls[0][0];
    expect(expCall.data[0].date).toBeInstanceOf(Date);
    expect(txMock.points.upsert).toHaveBeenCalledWith({
      where: { participantLogin: 'testuser' },
      create: { participantLogin: 'testuser', prp: 10, crp: 20, coins: 30 },
      update: { prp: 10, crp: 20, coins: 30 },
    });
    expect(txMock.feedback.upsert).toHaveBeenCalledWith({
      where: { participantLogin: 'testuser' },
      create: {
        participantLogin: 'testuser',
        punctuality: 4.5,
        interest: 4,
        thoroughness: 3.5,
        friendliness: 5,
      },
      update: {
        punctuality: 4.5,
        interest: 4,
        thoroughness: 3.5,
        friendliness: 5,
      },
    });
  });

  it('refreshes the token but skips fetch when data is fresh (keepalive decoupled from TTL)', async () => {
    prismaMock.participant.findUnique.mockResolvedValue({
      lastSyncedAt: new Date(),
    });

    const result = await service.syncUser({ id: 'u1', login: 'testuser' });

    expect(result).toEqual({ login: 'testuser', status: 'skipped' });
    expect(authServiceMock.refreshUserToken).toHaveBeenCalledTimes(1);
    expect(school21Mock.getParticipant).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('force=true overrides TTL and syncs', async () => {
    prismaMock.participant.findUnique.mockResolvedValue({
      lastSyncedAt: new Date(),
    });

    const result = await service.syncUser(
      { id: 'u1', login: 'testuser' },
      true,
    );

    expect(result).toEqual({ login: 'testuser', status: 'synced' });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns failed when token refresh rejects', async () => {
    authServiceMock.refreshUserToken.mockRejectedValue(
      new Error('invalid_grant'),
    );

    const result = await service.syncUser({ id: 'u1', login: 'testuser' });

    expect(result).toEqual({
      login: 'testuser',
      status: 'failed',
      error: 'token refresh failed',
    });
    expect(school21Mock.getParticipant).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('one failing user does not stop the rest in runOnce', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      mockUser,
      { ...mockUser, id: 'u2', login: 'otheruser' },
    ]);
    authServiceMock.refreshUserToken
      .mockRejectedValueOnce(new Error('invalid_grant'))
      .mockResolvedValue({ access_token: 'access-token' });

    const results = await service.runOnce(true);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      login: 'testuser',
      status: 'failed',
      error: 'token refresh failed',
    });
    expect(results[1]).toEqual({ login: 'otheruser', status: 'synced' });
  });

  it('normalizes campus object to campusId', async () => {
    school21Mock.getParticipant.mockResolvedValue({
      ...participantFixture,
      campus: { id: '42', name: 'Moscow' },
    });

    await service.syncUser({ id: 'u1', login: 'testuser' });

    const upsertCall = txMock.participant.upsert.mock.calls[0][0];
    expect(upsertCall.create.campusId).toBe('42');
    expect(upsertCall.update.campusId).toBe('42');
  });

  it('registers the cron task on module init', () => {
    service.onModuleInit();

    expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledTimes(1);
    const [name, job] = schedulerRegistryMock.addCronJob.mock.calls[0];
    expect(name).toBe('school21-sync');
    expect(job).toBeInstanceOf(CronJob);
    expect((job as CronJob).cronTime.source).toBe('0 */10 * * * *');
    void (job as CronJob).stop();
  });

  it('runOnce returns empty array when no users', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    const results = await service.runOnce();

    expect(results).toEqual([]);
  });
});
