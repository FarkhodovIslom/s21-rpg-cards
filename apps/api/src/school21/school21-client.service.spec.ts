import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, Observable } from 'rxjs';
import { AxiosError } from 'axios';
import { School21ClientService } from './school21-client.service.js';

describe('School21ClientService', () => {
  let service: School21ClientService;
  let configService: ConfigService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        School21ClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                SCHOOL21_API_BASE_URL: 'https://api.test',
              };
              return map[key];
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<School21ClientService>(School21ClientService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should request a participant with the Bearer token', async () => {
    const participant = {
      login: 'foo',
      className: 'class-1',
      parallelName: 'parallel-1',
      expValue: 1000,
      level: 3,
      expToNextLevel: 500,
      campus: 'moscow',
      status: 'active',
    };
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of({ data: participant } as any));

    const result = await service.getParticipant('foo', 'tok');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.test/participants/foo',
      { headers: { Authorization: 'Bearer tok' } },
    );
    expect(result).toEqual(participant);
  });

  it('should unwrap skills from the response body', async () => {
    const skills = [{ name: 'Algorithms', points: 42 }];
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of({ data: { skills } } as any));

    const result = await service.getSkills('foo', 'tok');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.test/participants/foo/skills',
      { headers: { Authorization: 'Bearer tok' } },
    );
    expect(result).toEqual(skills);
  });

  it('should unwrap badges from the response body', async () => {
    const badges = [
      {
        name: 'First peer review',
        receiptDateTime: '2026-01-01',
        iconUrl: 'https://example.com/first-peer-review.png',
      },
    ];
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of({ data: { badges } } as any));

    const result = await service.getBadges('foo', 'tok');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.test/participants/foo/badges',
      { headers: { Authorization: 'Bearer tok' } },
    );
    expect(result).toEqual(badges);
  });

  it('should unwrap expHistory from the response body', async () => {
    const expHistory = [{ amount: 10, date: '2026-01-01' }];
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of({ data: { expHistory } } as any));

    const result = await service.getExperienceHistory('foo', 'tok');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.test/participants/foo/experience-history',
      { headers: { Authorization: 'Bearer tok' } },
    );
    expect(result).toEqual(expHistory);
  });

  it('should return the raw logtime number without coercion', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(of({ data: 123.45 } as any));

    const result = await service.getLogtime('foo', 'tok');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.test/participants/foo/logtime',
      { headers: { Authorization: 'Bearer tok' } },
    );
    expect(result).toBe(123.45);
  });

  it('should throw when logtime response is not a raw number', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(of({ data: {} }));

    await expect(service.getLogtime('foo', 'tok')).rejects.toThrow(
      'Unexpected /logtime response for foo: expected raw number',
    );
  });

  it('should normalize errors without leaking the Authorization header', async () => {
    const config = { headers: { Authorization: 'Bearer secret-token' } };
    const axiosError = new AxiosError('boom', 'CODE', config, undefined, {
      status: 401,
    } as any);
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(
        new Observable((subscriber) => subscriber.error(axiosError)),
      );

    try {
      await service.getParticipant('foo', 'tok');
      fail('Expected a normalized error');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(AxiosError);
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toBe(
        'School21 API request failed: GET /participants/foo (401)',
      );
      expect(message).not.toContain('secret-token');
      expect(message).not.toContain('Bearer');
    }
  });

  it('should throw a clear config error when SCHOOL21_API_BASE_URL is missing', () => {
    jest.spyOn(configService, 'get').mockReturnValueOnce(undefined);

    expect(() => new School21ClientService(httpService, configService)).toThrow(
      'SCHOOL21_API_BASE_URL is not configured',
    );
  });

  it('should fetch campuses', async () => {
    const campuses = [{ id: '1', name: 'Moscow' }];
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of({ data: campuses } as any));

    const result = await service.getCampuses('tok');

    expect(httpService.get).toHaveBeenCalledWith('https://api.test/campuses', {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(result).toEqual(campuses);
  });

  it('should fetch coalitions of a campus', async () => {
    const coalitions = [{ id: '2', name: 'Sirius' }];
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of({ data: coalitions } as any));

    const result = await service.getCampusCoalitions('1', 'tok');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.test/campuses/1/coalitions',
      { headers: { Authorization: 'Bearer tok' } },
    );
    expect(result).toEqual(coalitions);
  });

  it('should fetch participants of a coalition', async () => {
    const participants = [
      {
        login: 'bar',
        className: 'class-1',
        parallelName: 'parallel-1',
        expValue: 100,
        level: 2,
        expToNextLevel: 50,
        campus: 'moscow',
        status: 'active',
      },
    ];
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of({ data: participants } as any));

    const result = await service.getCoalitionParticipants('2', 'tok');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.test/coalitions/2/participants',
      { headers: { Authorization: 'Bearer tok' } },
    );
    expect(result).toEqual(participants);
  });
});
