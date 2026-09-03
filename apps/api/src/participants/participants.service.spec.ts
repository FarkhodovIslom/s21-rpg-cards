import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ParticipantsService } from './participants.service.js';
import { AuthService } from '../auth/auth.service.js';
import { School21ClientService } from '../school21/school21-client.service.js';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let authRefresh: jest.Mock;
  let getParticipant: jest.Mock;
  let getSkills: jest.Mock;
  let getBadges: jest.Mock;
  let getPoints: jest.Mock;
  let getFeedback: jest.Mock;
  let getLogtime: jest.Mock;
  let getExperienceHistory: jest.Mock;

  beforeEach(async () => {
    authRefresh = jest.fn().mockResolvedValue({ access_token: 'tok' });
    getParticipant = jest.fn();
    getSkills = jest.fn().mockResolvedValue([]);
    getBadges = jest.fn().mockResolvedValue([]);
    getPoints = jest.fn();
    getFeedback = jest.fn();
    getLogtime = jest.fn().mockResolvedValue(0);
    getExperienceHistory = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: AuthService, useValue: { refreshUserToken: authRefresh } },
        {
          provide: School21ClientService,
          useValue: {
            getParticipant,
            getSkills,
            getBadges,
            getPoints,
            getFeedback,
            getLogtime,
            getExperienceHistory,
          },
        },
      ],
    }).compile();
    service = module.get(ParticipantsService);
  });

  it('proxies a full card and refreshes the token', async () => {
    getParticipant.mockResolvedValue({
      login: 'other',
      className: '21',
      parallelName: 'P1',
      expValue: 100,
      level: 2,
      expToNextLevel: 50,
      campus: { id: 'c9', shortName: '21 Nine' },
      status: 'ACTIVE',
    });
    getSkills.mockResolvedValue([{ name: 'C', points: 1790 }]);
    getBadges.mockResolvedValue([
      {
        name: 'W',
        receiptDateTime: '2024-05-01T00:00:00.000Z',
        iconUrl: 'https://x/y.png',
      },
    ]);
    getPoints.mockResolvedValue({
      peerReviewPoints: 1,
      codeReviewPoints: 2,
      coins: 3,
    });
    getFeedback.mockResolvedValue({
      averageVerifierPunctuality: 4,
      averageVerifierInterest: 4,
      averageVerifierThoroughness: 4,
      averageVerifierFriendliness: 4,
    });
    getLogtime.mockResolvedValue(12.5);
    getExperienceHistory.mockResolvedValue([
      { expValue: 5, accrualDateTime: '2024-05-01T10:00:00.000Z' },
    ]);

    const result = await service.findByLogin('u1', 'other');

    expect(authRefresh).toHaveBeenCalledWith('u1');
    expect(getParticipant).toHaveBeenCalledWith('other', 'tok');
    expect(getSkills).toHaveBeenCalledWith('other', 'tok');
    expect(result.campusId).toBe('c9');
    expect(result.skills).toEqual([{ name: 'C', value: 1790 }]);
    expect(result.domainRank).toEqual({ domain: 'Systems', rank: 'Adept' });
    expect(result.badges[0].receiptDate).toBe('2024-05-01T00:00:00.000Z');
    expect(result.points).toEqual({ prp: 1, crp: 2, coins: 3 });
    expect(result.logtime).toBe(12.5);
  });

  it('extracts campusId from the response', async () => {
    getParticipant.mockResolvedValue({
      login: 'o',
      className: '',
      parallelName: '',
      expValue: 0,
      level: 0,
      expToNextLevel: 0,
      campus: { id: 'c1', shortName: '21 One' },
      status: '',
    });
    getPoints.mockResolvedValue({
      peerReviewPoints: 0,
      codeReviewPoints: 0,
      coins: 0,
    });
    getFeedback.mockResolvedValue({
      averageVerifierPunctuality: 0,
      averageVerifierInterest: 0,
      averageVerifierThoroughness: 0,
      averageVerifierFriendliness: 0,
    });
    const result = await service.findByLogin('u1', 'o');
    expect(result.campusId).toBe('c1');
  });

  it('maps a 404 from the client to NotFoundException', async () => {
    getParticipant.mockRejectedValue(
      new Error('School21 API request failed: GET /participants/nope (404)'),
    );
    await expect(service.findByLogin('u1', 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(getSkills).not.toHaveBeenCalled();
  });

  it('rethrows non-404 client errors unchanged', async () => {
    getParticipant.mockRejectedValue(
      new Error('School21 API request failed: GET /participants/x (500)'),
    );
    await expect(service.findByLogin('u1', 'x')).rejects.toThrow('(500)');
  });
});
