import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { CardService } from './card.service.js';
import { PrismaService } from '../common/prisma.service.js';

const RECENT = new Date();
const STALE = new Date(Date.now() - 60 * 60 * 1000);

function makeParticipant(overrides: Record<string, unknown> = {}) {
  return {
    login: 'testuser',
    className: '21',
    parallelName: 'P1',
    expValue: 9600,
    level: 7,
    expToNextLevel: 6200,
    campusId: 'c1',
    status: 'ACTIVE',
    logtime: 5.48,
    lastSyncedAt: RECENT,
    skills: [{ name: 'C', value: 1790 }],
    badges: [
      {
        name: 'W',
        receiptDate: new Date('2024-05-01T00:00:00.000Z'),
        iconUrl: 'https://x/y.png',
      },
    ],
    points: { prp: 153, crp: 45, coins: 168 },
    feedback: {
      punctuality: 4.1,
      interest: 4.3,
      thoroughness: 4.3,
      friendliness: 4.3,
    },
    expHistory: [{ amount: 50, date: new Date('2024-05-01T10:00:00.000Z') }],
    ...overrides,
  };
}

describe('CardService', () => {
  let service: CardService;
  let userFind: jest.Mock;
  let participantFind: jest.Mock;

  beforeEach(async () => {
    userFind = jest.fn();
    participantFind = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: userFind },
            participant: { findUnique: participantFind },
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn(() => '15') } },
      ],
    }).compile();
    service = module.get(CardService);
  });

  it('maps a full cached card', async () => {
    userFind.mockResolvedValue({ id: 'u1', login: 'testuser' });
    participantFind.mockResolvedValue(makeParticipant());
    const result = await service.getOwnCard('u1');
    expect(result.login).toBe('testuser');
    expect(result.campusId).toBe('c1');
    expect(result.logtime).toBe(5.48);
    expect(result.skills).toEqual([{ name: 'C', value: 1790 }]);
    expect(result.domainRank).toEqual({ domain: 'Systems', rank: 'Adept' });
    expect(result.badges[0].receiptDate).toBe('2024-05-01T00:00:00.000Z');
    expect(result.badges[0].iconUrl).toBe('https://x/y.png');
    expect(result.points).toEqual({ prp: 153, crp: 45, coins: 168 });
    expect(result.feedback).toEqual({
      punctuality: 4.1,
      interest: 4.3,
      thoroughness: 4.3,
      friendliness: 4.3,
    });
    expect(result.expHistory[0].date).toBe('2024-05-01T10:00:00.000Z');
    expect(result.stale).toBe(false);
  });

  it('requests expHistory with orderBy date desc and take 50', async () => {
    userFind.mockResolvedValue({ id: 'u1', login: 'testuser' });
    participantFind.mockResolvedValue(makeParticipant());
    await service.getOwnCard('u1');
    expect(participantFind).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          expHistory: { orderBy: { date: 'desc' }, take: 50 },
        }),
      }),
    );
  });

  it('marks stale when lastSyncedAt is older than the TTL', async () => {
    userFind.mockResolvedValue({ id: 'u1', login: 'testuser' });
    participantFind.mockResolvedValue(makeParticipant({ lastSyncedAt: STALE }));
    const result = await service.getOwnCard('u1');
    expect(result.stale).toBe(true);
  });

  it('throws NotFoundException when the user is missing', async () => {
    userFind.mockResolvedValue(null);
    await expect(service.getOwnCard('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException when no participant row exists yet', async () => {
    userFind.mockResolvedValue({ id: 'u1', login: 'testuser' });
    participantFind.mockResolvedValue(null);
    await expect(service.getOwnCard('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
