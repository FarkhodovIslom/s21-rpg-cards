import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException } from '@nestjs/common';
import { of, Observable } from 'rxjs';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { decrypt, encrypt } from '../common/crypto.js';

describe('AuthService', () => {
  let service: AuthService;
  let configService: ConfigService;
  let httpService: HttpService;
  let prismaService: PrismaService;

  const mockEncryptionKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const mockUser = {
    id: 'user-123',
    login: 'testuser',
    encryptedRefreshToken: 'encrypted-value',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    user: {
      upsert: jest.fn().mockResolvedValue(mockUser),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                KEYCLOAK_URL: 'https://auth.21-school.ru/auth',
                KEYCLOAK_REALM: 'EduPowerKeycloak',
                KEYCLOAK_CLIENT_ID: 's21-open-api',
                TOKEN_ENCRYPTION_KEY: mockEncryptionKey,
              };
              return map[key];
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt refresh_token and upsert User, returning userId', async () => {
    const mockRefreshToken = 'my-secret-refresh-token';
    const mockData = {
      access_token: 'access123',
      refresh_token: mockRefreshToken,
    };
    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(of({ data: mockData } as any));

    const result = await service.login('testuser', 'testpass');

    // Verify Keycloak call
    const expectedUrl =
      'https://auth.21-school.ru/auth/realms/EduPowerKeycloak/protocol/openid-connect/token';
    expect(httpService.post).toHaveBeenCalledWith(
      expectedUrl,
      expect.any(String),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    // Verify upsert was called with encrypted token
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { login: 'testuser' },
      update: {
        encryptedRefreshToken: expect.any(String),
      },
      create: {
        login: 'testuser',
        encryptedRefreshToken: expect.any(String),
      },
    });

    // Verify the encrypted token can be decrypted back to the original
    const upsertCall = mockPrisma.user.upsert.mock.calls[0][0];
    const encrypted = upsertCall.create.encryptedRefreshToken;
    const decrypted = decrypt(encrypted, mockEncryptionKey);
    expect(decrypted).toBe(mockRefreshToken);

    // Verify tokens are NOT returned
    expect(result).not.toHaveProperty('access_token');
    expect(result).not.toHaveProperty('refresh_token');

    // Verify userId IS returned
    expect(result).toEqual({ userId: 'user-123' });
  });

  it('should throw if Keycloak config is missing', async () => {
    jest.spyOn(configService, 'get').mockReturnValue(undefined);

    await expect(service.login('testuser', 'testpass')).rejects.toThrow(
      'Missing Keycloak or encryption configuration',
    );
  });

  it('should throw UnauthorizedException without leaking request body on Keycloak 401', async () => {
    const axiosError = new Error('Request failed with status code 401');
    (axiosError as any).config = {
      data: 'grant_type=password&username=testuser&password=testpass',
    };
    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(
        new Observable((subscriber) => subscriber.error(axiosError)),
      );

    try {
      await service.login('testuser', 'testpass');
      fail('Expected UnauthorizedException');
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(JSON.stringify(err)).not.toContain('testpass');
      expect(JSON.stringify(err)).not.toContain('grant_type');
    }
  });

  it('should not store password on service instance', async () => {
    const mockData = {
      access_token: 'access123',
      refresh_token: 'refresh123',
    };
    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(of({ data: mockData } as any));

    await service.login('testuser', 'testpass');

    expect((service as any).password).toBeUndefined();
  });

  describe('refreshUserToken', () => {
    it('should decrypt refresh_token, call Keycloak, update DB, return access_token', async () => {
      const originalRefreshToken = 'old-refresh-token-value';
      const storedEncrypted = encrypt(originalRefreshToken, mockEncryptionKey);

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        encryptedRefreshToken: storedEncrypted,
      });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const newRefreshToken = 'new-refresh-token-value';
      const newAccessToken = 'new-access-token-value';
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
          },
        } as any),
      );

      const result = await service.refreshUserToken('user-123');

      // Verify user was looked up
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });

      // Verify Keycloak refresh call
      const expectedUrl =
        'https://auth.21-school.ru/auth/realms/EduPowerKeycloak/protocol/openid-connect/token';
      expect(httpService.post).toHaveBeenCalledWith(
        expectedUrl,
        expect.any(String),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      const calledBody = (httpService.post as jest.Mock).mock
        .calls[0][1] as string;
      const params = new URLSearchParams(calledBody);
      expect(params.get('grant_type')).toBe('refresh_token');
      expect(params.get('client_id')).toBe('s21-open-api');
      expect(params.get('refresh_token')).toBe(originalRefreshToken);

      // Verify DB was updated with NEW encrypted refresh_token
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          encryptedRefreshToken: expect.any(String),
        },
      });
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      const decryptedNew = decrypt(
        updateCall.data.encryptedRefreshToken,
        mockEncryptionKey,
      );
      expect(decryptedNew).toBe(newRefreshToken);

      // Verify only access_token is returned (no refresh_token leak)
      expect(result).toEqual({ access_token: newAccessToken });
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshUserToken('nonexistent')).rejects.toThrow(
        'User not found: nonexistent',
      );
    });

    it('should throw if Keycloak returns invalid_grant (no retry)', async () => {
      const storedEncrypted = encrypt('valid-token', mockEncryptionKey);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        encryptedRefreshToken: storedEncrypted,
      });

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: {
            error: 'invalid_grant',
            error_description: 'Token expired',
          },
        } as any),
      );

      await expect(service.refreshUserToken('user-123')).rejects.toThrow();

      // Verify no retry was attempted
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });
  });
});
