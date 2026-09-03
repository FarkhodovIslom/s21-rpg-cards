import { Test, TestingModule } from '@nestjs/testing';
import { BrowseService } from './browse.service.js';
import { AuthService } from '../auth/auth.service.js';
import { School21ClientService } from '../school21/school21-client.service.js';

describe('BrowseService', () => {
  let service: BrowseService;
  let authRefresh: jest.Mock;
  let getCampuses: jest.Mock;
  let getCampusCoalitions: jest.Mock;
  let getCoalitionParticipants: jest.Mock;

  beforeEach(async () => {
    authRefresh = jest.fn().mockResolvedValue({ access_token: 'tok' });
    getCampuses = jest.fn();
    getCampusCoalitions = jest.fn();
    getCoalitionParticipants = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrowseService,
        { provide: AuthService, useValue: { refreshUserToken: authRefresh } },
        {
          provide: School21ClientService,
          useValue: {
            getCampuses,
            getCampusCoalitions,
            getCoalitionParticipants,
          },
        },
      ],
    }).compile();
    service = module.get(BrowseService);
  });

  it('listCampuses returns { campuses }', async () => {
    getCampuses.mockResolvedValue([
      { id: '1', shortName: 'msk', fullName: 'Moscow' },
    ]);
    const result = await service.listCampuses('u1');
    expect(authRefresh).toHaveBeenCalledWith('u1');
    expect(getCampuses).toHaveBeenCalledWith('tok');
    expect(result).toEqual({
      campuses: [{ id: '1', shortName: 'msk', fullName: 'Moscow' }],
    });
  });

  it('listCampusCoalitions returns { coalitions }', async () => {
    getCampusCoalitions.mockResolvedValue([{ coalitionId: 2, name: 'Sirius' }]);
    const result = await service.listCampusCoalitions('u1', '1');
    expect(getCampusCoalitions).toHaveBeenCalledWith('1', 'tok');
    expect(result).toEqual({
      coalitions: [{ coalitionId: 2, name: 'Sirius' }],
    });
  });

  it('listCoalitionParticipants returns { participants: logins }', async () => {
    getCoalitionParticipants.mockResolvedValue(['a', 'b']);
    const result = await service.listCoalitionParticipants('u1', '2');
    expect(getCoalitionParticipants).toHaveBeenCalledWith('2', 'tok');
    expect(result).toEqual({ participants: ['a', 'b'] });
  });
});
